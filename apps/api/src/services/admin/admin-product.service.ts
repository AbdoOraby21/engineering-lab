import { Prisma } from '@prisma/client';
import type {
  AdminCreateProductInput,
  AdminProductCardDto,
  AdminProductListQuery,
  AdminProductListResult,
  AdminSpecsInput,
  AdminBundleItemsInput,
  AdminUpdateProductInput,
  AdminVariantInput,
  AdminVariantUpdate,
  ProductSpecDto,
} from '@engineering-lab/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError, ErrorCodes } from '../../utils/errors.js';
import { sanitizePlainText, sanitizeRichText } from '../../utils/sanitize.js';
import { paginationMeta } from '../../utils/pagination.js';
import { uniqueSlug } from '../../utils/slug.js';
import { invalidateCatalogCache } from '../../utils/cache.js';
import { getStorageDriver } from '../storage/index.js';
import { sniffFileKind } from '../../utils/file-signatures.js';
import {
  applyStockDelta,
  availableStock,
  setStockAbsolute,
} from '../inventory.service.js';
import {
  productCardInclude,
  productDetailInclude,
  type ProductCardSource,
} from '../catalog/includes.js';
import {
  toProductCard,
  toProductDetail,
  toAbsoluteUrl,
} from '../catalog/serializers.js';
import { getRatingSummary } from '../catalog/review.service.js';

function toAdminCard(product: ProductCardSource & { isActive: boolean; reservedStock: number; datasheetUrl: string | null }): AdminProductCardDto {
  return {
    ...toProductCard(product),
    isActive: product.isActive,
    reservedStock: product.reservedStock,
    datasheetUrl: toAbsoluteUrl(product.datasheetUrl),
  };
}

export async function listAdminProducts(
  query: AdminProductListQuery,
): Promise<AdminProductListResult> {
  const where: Prisma.ProductWhereInput = {};
  if (query.q) {
    where.OR = [
      { nameAr: { contains: query.q, mode: 'insensitive' } },
      { nameEn: { contains: query.q, mode: 'insensitive' } },
      { sku: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }
  if (query.brandId) {
    where.brandId = query.brandId;
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productCardInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  const items: AdminProductCardDto[] = products.map((product) =>
    toAdminCard(product as ProductCardSource & {
      isActive: boolean;
      reservedStock: number;
      datasheetUrl: string | null;
    }),
  );

  return {
    items,
    pagination: paginationMeta(query.page, query.pageSize, total),
  };
}

async function loadBreadcrumb(categoryId: string) {
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true, nameAr: true, nameEn: true, parentId: true },
  });
  const byId = new Map(categories.map((entry) => [entry.id, entry]));
  const breadcrumb: Array<{ id: string; nameAr: string; nameEn: string; slug: string }> = [];
  const visited = new Set<string>();
  let current = byId.get(categoryId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    breadcrumb.unshift({
      id: current.id,
      nameAr: current.nameAr,
      nameEn: current.nameEn,
      slug: current.slug,
    });
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return breadcrumb;
}

export async function getAdminProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: productDetailInclude,
  });
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  const [ratingSummary, breadcrumb] = await Promise.all([
    getRatingSummary(product.id),
    loadBreadcrumb(product.category.id),
  ]);

  const available = availableStock({
    type: product.type,
    stock: product.stock,
    reservedStock: product.reservedStock,
    variants: product.variants.map((variant) => ({
      stock: variant.stock,
      isActive: variant.isActive,
    })),
    bundleItems: product.bundleItems.map((item) => ({
      quantity: item.quantity,
      component: {
        stock: item.component.stock,
        reservedStock: item.component.reservedStock,
        variants: item.component.variants.map((variant) => ({
          stock: variant.stock,
          isActive: variant.isActive,
        })),
      },
    })),
  });

  return toProductDetail(product, {
    availableStock: available,
    ratingSummary,
    breadcrumb,
  });
}

async function findLeafCategory(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { children: true } } },
  });
  if (!category) {
    throw AppError.badRequest('Category not found', ErrorCodes.CATEGORY_NOT_FOUND);
  }
  if (category._count.children > 0) {
    throw AppError.unprocessable('Products must belong to a leaf category');
  }
  return category;
}

async function nextUniqueSlug(
  base: string,
  excludeId?: string,
): Promise<string> {
  return uniqueSlug(base, async (candidate) => {
    const product = await prisma.product.findFirst({
      where: { slug: candidate },
      select: { id: true },
    });
    return product !== null && product.id !== excludeId;
  });
}

function sanitizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => sanitizePlainText(tag).toLowerCase()).filter(Boolean))].slice(
    0,
    20,
  );
}

export async function createAdminProduct(
  input: AdminCreateProductInput,
  createdById?: string | null,
) {
  await findLeafCategory(input.categoryId);

  if (input.brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
    if (!brand) {
      throw AppError.badRequest('Brand not found', ErrorCodes.BRAND_NOT_FOUND);
    }
  }

  const skuTaken = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (skuTaken) {
    throw AppError.conflict('A product with this SKU already exists', ErrorCodes.CONFLICT);
  }

  let slug: string;
  if (input.slug) {
    const taken = await prisma.product.findUnique({ where: { slug: input.slug } });
    if (taken) {
      throw AppError.conflict('A product with this slug already exists', ErrorCodes.CONFLICT_SLUG);
    }
    slug = input.slug;
  } else {
    slug = await nextUniqueSlug(input.nameEn);
  }

  const created = await prisma.product.create({
    data: {
      nameAr: sanitizePlainText(input.nameAr),
      nameEn: sanitizePlainText(input.nameEn),
      slug,
      sku: input.sku.toUpperCase(),
      descriptionAr: sanitizeRichText(input.descriptionAr),
      descriptionEn: sanitizeRichText(input.descriptionEn),
      shortDescriptionAr: input.shortDescriptionAr
        ? sanitizePlainText(input.shortDescriptionAr)
        : null,
      shortDescriptionEn: input.shortDescriptionEn
        ? sanitizePlainText(input.shortDescriptionEn)
        : null,
      price: input.price,
      compareAtPrice: input.compareAtPrice ?? null,
      stock: 0,
      lowStockThreshold: input.lowStockThreshold,
      weightGrams: input.weightGrams ?? null,
      brandId: input.brandId ?? null,
      categoryId: input.categoryId,
      isFeatured: input.isFeatured,
      isNew: input.isNew,
      isActive: input.isActive,
      type: input.type,
      datasheetUrl: input.datasheetUrl ?? null,
      tags: sanitizeTags(input.tags),
      specs: input.specs as unknown as Prisma.InputJsonValue,
      seoTitleAr: input.seoTitleAr ?? null,
      seoTitleEn: input.seoTitleEn ?? null,
      seoDescriptionAr: input.seoDescriptionAr ?? null,
      seoDescriptionEn: input.seoDescriptionEn ?? null,
    },
  });

  if (input.stock > 0) {
    await setStockAbsolute(
      {
        productId: created.id,
        newStock: input.stock,
        reason: 'INITIAL',
        note: 'Initial stock at product creation',
        createdById: createdById ?? null,
      },
    );
  }

  invalidateCatalogCache();
  return getAdminProduct(created.id);
}

export async function updateAdminProduct(
  id: string,
  input: AdminUpdateProductInput,
) {
  const existing = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: { select: { variants: true, bundleItems: true } },
    },
  });
  if (!existing) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  const mergedPrice = input.price ?? existing.price;
  const mergedCompareAt =
    input.compareAtPrice === undefined ? existing.compareAtPrice : input.compareAtPrice;
  if (mergedCompareAt !== null && mergedCompareAt !== undefined && mergedCompareAt <= mergedPrice) {
    throw AppError.unprocessable('compareAtPrice must be greater than price');
  }

  if (input.categoryId && input.categoryId !== existing.categoryId) {
    await findLeafCategory(input.categoryId);
  }

  if (input.brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
    if (!brand) {
      throw AppError.badRequest('Brand not found', ErrorCodes.BRAND_NOT_FOUND);
    }
  }

  if (input.type && input.type !== existing.type) {
    if (input.type === 'BUNDLE' && existing._count.variants > 0) {
      throw AppError.unprocessable(
        'Remove the product variants before converting it to a bundle',
      );
    }
    if (input.type === 'SIMPLE' && existing._count.bundleItems > 0) {
      throw AppError.unprocessable(
        'Remove the bundle items before converting it to a simple product',
      );
    }
  }

  if (input.sku && input.sku.toUpperCase() !== existing.sku) {
    const taken = await prisma.product.findUnique({ where: { sku: input.sku.toUpperCase() } });
    if (taken) {
      throw AppError.conflict('A product with this SKU already exists', ErrorCodes.CONFLICT);
    }
  }
  if (input.slug && input.slug !== existing.slug) {
    const taken = await prisma.product.findUnique({ where: { slug: input.slug } });
    if (taken) {
      throw AppError.conflict('A product with this slug already exists', ErrorCodes.CONFLICT_SLUG);
    }
  }

  await prisma.product.update({
    where: { id },
    data: {
      ...(input.nameAr === undefined ? {} : { nameAr: sanitizePlainText(input.nameAr) }),
      ...(input.nameEn === undefined ? {} : { nameEn: sanitizePlainText(input.nameEn) }),
      ...(input.slug === undefined ? {} : { slug: input.slug }),
      ...(input.sku === undefined ? {} : { sku: input.sku.toUpperCase() }),
      ...(input.descriptionAr === undefined
        ? {}
        : { descriptionAr: sanitizeRichText(input.descriptionAr) }),
      ...(input.descriptionEn === undefined
        ? {}
        : { descriptionEn: sanitizeRichText(input.descriptionEn) }),
      ...(input.shortDescriptionAr === undefined
        ? {}
        : {
            shortDescriptionAr: input.shortDescriptionAr
              ? sanitizePlainText(input.shortDescriptionAr)
              : null,
          }),
      ...(input.shortDescriptionEn === undefined
        ? {}
        : {
            shortDescriptionEn: input.shortDescriptionEn
              ? sanitizePlainText(input.shortDescriptionEn)
              : null,
          }),
      ...(input.price === undefined ? {} : { price: input.price }),
      ...(input.compareAtPrice === undefined ? {} : { compareAtPrice: input.compareAtPrice }),
      ...(input.lowStockThreshold === undefined ? {} : { lowStockThreshold: input.lowStockThreshold }),
      ...(input.weightGrams === undefined ? {} : { weightGrams: input.weightGrams }),
      ...(input.brandId === undefined ? {} : { brandId: input.brandId }),
      ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
      ...(input.isFeatured === undefined ? {} : { isFeatured: input.isFeatured }),
      ...(input.isNew === undefined ? {} : { isNew: input.isNew }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      ...(input.type === undefined ? {} : { type: input.type }),
      ...(input.datasheetUrl === undefined ? {} : { datasheetUrl: input.datasheetUrl }),
      ...(input.tags === undefined ? {} : { tags: sanitizeTags(input.tags) }),
      ...(input.specs === undefined
        ? {}
        : { specs: input.specs as unknown as Prisma.InputJsonValue }),
      ...(input.seoTitleAr === undefined ? {} : { seoTitleAr: input.seoTitleAr }),
      ...(input.seoTitleEn === undefined ? {} : { seoTitleEn: input.seoTitleEn }),
      ...(input.seoDescriptionAr === undefined ? {} : { seoDescriptionAr: input.seoDescriptionAr }),
      ...(input.seoDescriptionEn === undefined ? {} : { seoDescriptionEn: input.seoDescriptionEn }),
    },
  });

  invalidateCatalogCache();
  return getAdminProduct(id);
}

export async function deleteAdminProduct(id: string) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      _count: {
        select: {
          reviews: true,
          stockMovements: true,
          componentOf: true,
        },
      },
    },
  });
  if (!existing) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  // Products with history are soft-deleted (kept for orders, reviews and audit).
  const hasHistory =
    existing._count.reviews > 0 ||
    existing._count.stockMovements > 0 ||
    existing._count.componentOf > 0;

  if (hasHistory) {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    invalidateCatalogCache();
    return { id, mode: 'soft' as const };
  }

  await prisma.product.delete({ where: { id } });
  invalidateCatalogCache();
  return { id, mode: 'hard' as const };
}

function copySuffix(): string {
  return Date.now().toString(36).toUpperCase().slice(-4);
}

export async function duplicateAdminProduct(id: string) {
  const source = await prisma.product.findUnique({
    where: { id },
    include: {
      images: true,
      variants: true,
      bundleItems: true,
    },
  });
  if (!source) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  const suffix = copySuffix();
  const sku = `${source.sku.slice(0, 48)}-C${suffix}`;
  const slug = await nextUniqueSlug(`${source.nameEn}-copy`);

  const created = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        nameAr: `${source.nameAr} (نسخة)`,
        nameEn: `${source.nameEn} (Copy)`,
        slug,
        sku,
        descriptionAr: source.descriptionAr,
        descriptionEn: source.descriptionEn,
        shortDescriptionAr: source.shortDescriptionAr,
        shortDescriptionEn: source.shortDescriptionEn,
        price: source.price,
        compareAtPrice: source.compareAtPrice,
        stock: 0,
        lowStockThreshold: source.lowStockThreshold,
        weightGrams: source.weightGrams,
        brandId: source.brandId,
        categoryId: source.categoryId,
        isFeatured: false,
        isNew: false,
        isActive: false,
        type: source.type,
        datasheetUrl: source.datasheetUrl,
        tags: source.tags,
        specs: source.specs === null ? Prisma.JsonNull : (source.specs as Prisma.InputJsonValue),
        seoTitleAr: source.seoTitleAr,
        seoTitleEn: source.seoTitleEn,
        seoDescriptionAr: source.seoDescriptionAr,
        seoDescriptionEn: source.seoDescriptionEn,
      },
    });

    if (source.images.length > 0) {
      await tx.productImage.createMany({
        data: source.images.map((image) => ({
          productId: product.id,
          url: image.url,
          thumbnailUrl: image.thumbnailUrl,
          // Copies share the same underlying file; keep publicId NULL so
          // deleting a copy never removes the shared asset.
          publicId: null,
          altAr: image.altAr,
          altEn: image.altEn,
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary,
        })),
      });
    }

    if (source.variants.length > 0) {
      await tx.productVariant.createMany({
        data: source.variants.map((variant) => ({
          productId: product.id,
          nameAr: variant.nameAr,
          nameEn: variant.nameEn,
          sku: `${variant.sku.slice(0, 48)}-C${suffix}`,
          priceDelta: variant.priceDelta,
          stock: 0,
          isActive: variant.isActive,
          sortOrder: variant.sortOrder,
        })),
      });
    }

    if (source.bundleItems.length > 0) {
      await tx.bundleItem.createMany({
        data: source.bundleItems.map((item) => ({
          bundleId: product.id,
          componentId: item.componentId,
          quantity: item.quantity,
        })),
      });
    }

    return product;
  });

  invalidateCatalogCache();
  return getAdminProduct(created.id);
}

export async function setProductFlag(
  id: string,
  field: 'isFeatured' | 'isNew' | 'isActive',
  value?: boolean,
) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, isFeatured: true, isNew: true, isActive: true },
  });
  if (!existing) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }
  const next = value ?? !existing[field];
  await prisma.product.update({ where: { id }, data: { [field]: next } });
  invalidateCatalogCache();
  return { id, [field]: next };
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export interface UploadedImageFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export async function addProductImage(
  productId: string,
  file: UploadedImageFile,
  alt: { altAr?: string | null; altEn?: string | null },
) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  const kind = sniffFileKind(file.buffer);
  if (kind !== 'jpeg' && kind !== 'png' && kind !== 'webp') {
    throw AppError.badRequest('File is not a valid JPEG, PNG or WebP image', ErrorCodes.UNSUPPORTED_FILE_TYPE);
  }

  const storage = getStorageDriver();
  const stored = await storage.uploadImage({
    buffer: file.buffer,
    originalName: file.originalName,
    mimeType: file.mimeType,
    folder: 'products',
  });

  const imageCount = await prisma.productImage.count({ where: { productId } });
  const image = await prisma.productImage.create({
    data: {
      productId,
      url: stored.url,
      thumbnailUrl: stored.thumbnailUrl ?? null,
      publicId: stored.publicId,
      altAr: alt.altAr ? sanitizePlainText(alt.altAr) : null,
      altEn: alt.altEn ? sanitizePlainText(alt.altEn) : null,
      sortOrder: imageCount,
      isPrimary: imageCount === 0,
    },
  });

  invalidateCatalogCache();
  return image;
}

export async function reorderProductImages(productId: string, imageIds: string[]) {
  const images = await prisma.productImage.findMany({
    where: { productId },
    select: { id: true },
  });
  const owned = new Set(images.map((image) => image.id));
  const unknown = imageIds.filter((id) => !owned.has(id));
  if (unknown.length > 0) {
    throw AppError.unprocessable('Some image ids do not belong to this product', ErrorCodes.VALIDATION_ERROR, {
      unknown,
    });
  }

  await prisma.$transaction(
    imageIds.map((id, index) =>
      prisma.productImage.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
  invalidateCatalogCache();
  return prisma.productImage.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } });
}

export async function setPrimaryImage(productId: string, imageId: string) {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image || image.productId !== productId) {
    throw AppError.notFound('Image not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  await prisma.$transaction([
    prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
    prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
  ]);
  invalidateCatalogCache();
  return { id: imageId, isPrimary: true };
}

export async function deleteProductImage(productId: string, imageId: string) {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image || image.productId !== productId) {
    throw AppError.notFound('Image not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  await prisma.productImage.delete({ where: { id: imageId } });

  if (image.publicId) {
    try {
      await getStorageDriver().deleteFile(image.publicId);
    } catch {
      // A missing remote file must not block the admin operation.
    }
  }

  if (image.isPrimary) {
    const next = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
    if (next) {
      await prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  }

  invalidateCatalogCache();
  return { id: imageId, deleted: true };
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

async function assertSimpleProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, type: true },
  });
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }
  if (product.type === 'BUNDLE') {
    throw AppError.unprocessable('A bundle product cannot have variants');
  }
  return product;
}

export async function addVariant(productId: string, input: AdminVariantInput) {
  await assertSimpleProduct(productId);

  const skuTaken = await prisma.productVariant.findUnique({ where: { sku: input.sku } });
  if (skuTaken) {
    throw AppError.conflict('A variant with this SKU already exists', ErrorCodes.CONFLICT);
  }

  const variantCount = await prisma.productVariant.count({ where: { productId } });
  const variant = await prisma.productVariant.create({
    data: {
      productId,
      nameAr: sanitizePlainText(input.nameAr),
      nameEn: sanitizePlainText(input.nameEn),
      sku: input.sku.toUpperCase(),
      priceDelta: input.priceDelta,
      stock: 0,
      isActive: input.isActive,
      sortOrder: input.sortOrder ?? variantCount,
    },
  });

  if (input.stock > 0) {
    await setStockAbsolute({
      productId,
      variantId: variant.id,
      newStock: input.stock,
      reason: 'INITIAL',
      note: 'Initial stock at variant creation',
    });
  }

  invalidateCatalogCache();
  return variant;
}

export async function updateVariant(variantId: string, input: AdminVariantUpdate) {
  const existing = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { type: true } } },
  });
  if (!existing) {
    throw AppError.notFound('Variant not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }
  if (existing.product.type === 'BUNDLE') {
    throw AppError.unprocessable('A bundle product cannot have variants');
  }

  if (input.sku && input.sku.toUpperCase() !== existing.sku) {
    const taken = await prisma.productVariant.findUnique({ where: { sku: input.sku.toUpperCase() } });
    if (taken) {
      throw AppError.conflict('A variant with this SKU already exists', ErrorCodes.CONFLICT);
    }
  }

  const variant = await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      ...(input.nameAr === undefined ? {} : { nameAr: sanitizePlainText(input.nameAr) }),
      ...(input.nameEn === undefined ? {} : { nameEn: sanitizePlainText(input.nameEn) }),
      ...(input.sku === undefined ? {} : { sku: input.sku.toUpperCase() }),
      ...(input.priceDelta === undefined ? {} : { priceDelta: input.priceDelta }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    },
  });

  invalidateCatalogCache();
  return variant;
}

export async function deleteVariant(variantId: string) {
  const existing = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { _count: { select: { stockMovements: true } } },
  });
  if (!existing) {
    throw AppError.notFound('Variant not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  if (existing._count.stockMovements > 0) {
    await prisma.productVariant.update({ where: { id: variantId }, data: { isActive: false } });
    invalidateCatalogCache();
    return { id: variantId, mode: 'soft' as const };
  }

  await prisma.productVariant.delete({ where: { id: variantId } });
  invalidateCatalogCache();
  return { id: variantId, mode: 'hard' as const };
}

// ---------------------------------------------------------------------------
// Bundle items
// ---------------------------------------------------------------------------

export async function replaceBundleItems(productId: string, input: AdminBundleItemsInput) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, type: true },
  });
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }
  if (product.type !== 'BUNDLE') {
    throw AppError.unprocessable('Only bundle products can have bundle items');
  }

  const componentIds = input.items.map((item) => item.componentId);
  if (componentIds.includes(productId)) {
    throw AppError.unprocessable('A bundle cannot include itself');
  }

  const components = await prisma.product.findMany({
    where: { id: { in: componentIds } },
    select: { id: true, type: true, isActive: true },
  });
  if (components.length !== componentIds.length) {
    throw AppError.unprocessable('Some components do not exist');
  }
  const bundles = components.filter((component) => component.type === 'BUNDLE');
  if (bundles.length > 0) {
    throw AppError.unprocessable('A bundle item cannot itself be a bundle', ErrorCodes.BUNDLE_RULE_VIOLATION, {
      bundles: bundles.map((entry) => entry.id),
    });
  }

  await prisma.$transaction([
    prisma.bundleItem.deleteMany({ where: { bundleId: productId } }),
    ...input.items.map((item) =>
      prisma.bundleItem.create({
        data: { bundleId: productId, componentId: item.componentId, quantity: item.quantity },
      }),
    ),
  ]);

  invalidateCatalogCache();
  return getAdminProduct(productId);
}

// ---------------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------------

export async function replaceSpecs(productId: string, input: AdminSpecsInput) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  const specs: ProductSpecDto[] = input.specs.map((spec) => ({
    keyAr: sanitizePlainText(spec.keyAr),
    keyEn: sanitizePlainText(spec.keyEn),
    valueAr: sanitizePlainText(spec.valueAr),
    valueEn: sanitizePlainText(spec.valueEn),
  }));

  await prisma.product.update({
    where: { id: productId },
    data: { specs: specs as unknown as Prisma.InputJsonValue },
  });

  invalidateCatalogCache();
  return { id: productId, specs };
}

// ---------------------------------------------------------------------------
// Stock + movements + low stock
// ---------------------------------------------------------------------------

export async function adminAdjustStock(
  productId: string,
  input: { delta: number; reason: import('@prisma/client').StockMovementReason; note?: string | null; variantId?: string | null },
  createdById?: string | null,
) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  const result = await applyStockDelta({
    productId,
    variantId: input.variantId ?? null,
    delta: input.delta,
    reason: input.reason,
    note: input.note ?? null,
    createdById: createdById ?? null,
  });

  invalidateCatalogCache();
  return result;
}

export async function listMovements(query: {
  productId?: string;
  variantId?: string;
  reason?: import('@prisma/client').StockMovementReason;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.StockMovementWhereInput = {
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.variantId ? { variantId: query.variantId } : {}),
    ...(query.reason ? { reason: query.reason } : {}),
  };

  const [total, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, nameAr: true, nameEn: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    movements: movements.map((movement) => ({
      id: movement.id,
      productId: movement.productId,
      variantId: movement.variantId,
      delta: movement.delta,
      reason: movement.reason,
      note: movement.note,
      createdAt: movement.createdAt.toISOString(),
      createdBy: movement.createdBy,
      product: movement.product,
    })),
    pagination: paginationMeta(query.page, query.pageSize, total),
  };
}

export async function getLowStock(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;

  const baseSelect = Prisma.sql`
    SELECT p.id AS "productId", NULL::text AS "variantId", p.sku,
           p."nameAr", p."nameEn", p.stock, p."lowStockThreshold", p.type::text AS type
    FROM "Product" p
    WHERE p."isActive" = true
      AND NOT EXISTS (
        SELECT 1 FROM "ProductVariant" v
        WHERE v."productId" = p.id AND v."isActive" = true
      )
      AND p.stock <= p."lowStockThreshold"
    UNION ALL
    SELECT p.id AS "productId", v.id AS "variantId", v.sku,
           p."nameAr" || ' / ' || v."nameAr" AS "nameAr",
           p."nameEn" || ' / ' || v."nameEn" AS "nameEn",
           v.stock, p."lowStockThreshold", p.type::text AS type
    FROM "ProductVariant" v
    JOIN "Product" p ON p.id = v."productId"
    WHERE v."isActive" = true
      AND p."isActive" = true
      AND v.stock <= p."lowStockThreshold"
  `;

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<Array<{
      productId: string;
      variantId: string | null;
      sku: string;
      nameAr: string;
      nameEn: string;
      stock: number;
      lowStockThreshold: number;
      type: string;
    }>>(Prisma.sql`
      SELECT * FROM (${baseSelect}) AS low_stock
      ORDER BY stock ASC, sku ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `),
    prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT count(*)::int AS count FROM (${baseSelect}) AS low_stock
    `),
  ]);

  const total = countRows[0]?.count ?? 0;
  return {
    items: rows.map((row) => ({
      productId: row.productId,
      variantId: row.variantId,
      sku: row.sku,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      stock: row.stock,
      lowStockThreshold: row.lowStockThreshold,
      type: row.type as 'SIMPLE' | 'BUNDLE',
    })),
    pagination: paginationMeta(page, pageSize, total),
  };
}
