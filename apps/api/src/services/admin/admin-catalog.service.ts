import type { Category } from '@prisma/client';
import type {
  AdminBannerInput,
  AdminBannerUpdate,
  AdminBrandInput,
  AdminBrandUpdate,
  AdminCategoryInput,
  AdminCategoryReorderInput,
  AdminCategoryUpdate,
  BrandDto,
  CategoryDto,
} from '@engineering-lab/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError, ErrorCodes } from '../../utils/errors.js';
import { sanitizePlainText } from '../../utils/sanitize.js';
import { uniqueSlug } from '../../utils/slug.js';
import { invalidateCatalogCache } from '../../utils/cache.js';
import {
  toBrandDto,
  toCategoryDto,
} from '../catalog/serializers.js';

async function visibleProductCounts(): Promise<Map<string, number>> {
  const counts = await prisma.product.groupBy({
    by: ['categoryId'],
    where: {
      isActive: true,
      category: {
        isActive: true,
        OR: [{ parentId: null }, { parent: { isActive: true } }],
      },
      OR: [{ brandId: null }, { brand: { isActive: true } }],
    },
    _count: { _all: true },
  });
  return new Map(counts.map((row) => [row.categoryId, row._count._all]));
}

function buildCategoryTree(
  categories: Category[],
  counts: Map<string, number>,
): CategoryDto[] {
  const byParent = new Map<string | null, Category[]>();
  for (const category of categories) {
    const siblings = byParent.get(category.parentId) ?? [];
    siblings.push(category);
    byParent.set(category.parentId, siblings);
  }

  const build = (category: Category): CategoryDto => ({
    ...toCategoryDto(category, counts.get(category.id) ?? 0, []),
    children: (byParent.get(category.id) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn))
      .map(build),
  });

  return (byParent.get(null) ?? [])
    .sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn))
    .map(build);
}

export async function listAdminCategories(): Promise<CategoryDto[]> {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
    }),
    visibleProductCounts(),
  ]);
  return buildCategoryTree(categories, counts);
}

export async function createCategory(input: AdminCategoryInput): Promise<CategoryDto> {
  if (input.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
    if (!parent) {
      throw AppError.badRequest('Parent category not found', ErrorCodes.CATEGORY_NOT_FOUND);
    }
  }

  const slug = input.slug
    ? input.slug
    : await uniqueSlug(input.nameEn, async (candidate) => {
        const existing = await prisma.category.findUnique({ where: { slug: candidate } });
        return existing !== null;
      });

  if (input.slug) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw AppError.conflict('A category with this slug already exists', ErrorCodes.CONFLICT_SLUG);
    }
  }

  const category = await prisma.category.create({
    data: {
      nameAr: sanitizePlainText(input.nameAr),
      nameEn: sanitizePlainText(input.nameEn),
      slug,
      descriptionAr: input.descriptionAr ? sanitizePlainText(input.descriptionAr) : null,
      descriptionEn: input.descriptionEn ? sanitizePlainText(input.descriptionEn) : null,
      imageUrl: input.imageUrl ?? null,
      icon: input.icon ?? null,
      parentId: input.parentId ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      seoTitleAr: input.seoTitleAr ?? null,
      seoTitleEn: input.seoTitleEn ?? null,
      seoDescriptionAr: input.seoDescriptionAr ?? null,
      seoDescriptionEn: input.seoDescriptionEn ?? null,
    },
  });

  invalidateCatalogCache();
  const [counts] = await Promise.all([visibleProductCounts()]);
  return toCategoryDto(category, counts.get(category.id) ?? 0, []);
}

async function assertNoCycle(categoryId: string, parentId: string | null | undefined) {
  if (!parentId) {
    return;
  }
  if (parentId === categoryId) {
    throw AppError.unprocessable('A category cannot be its own parent');
  }

  const categories = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const byId = new Map(categories.map((entry) => [entry.id, entry]));
  let cursor: string | null | undefined = parentId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === categoryId) {
      throw AppError.unprocessable('A category cannot be moved under its own descendant');
    }
    if (seen.has(cursor)) {
      break;
    }
    seen.add(cursor);
    cursor = byId.get(cursor)?.parentId;
  }
}

export async function updateCategory(
  id: string,
  input: AdminCategoryUpdate,
): Promise<CategoryDto> {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound('Category not found', ErrorCodes.CATEGORY_NOT_FOUND);
  }

  if (input.parentId !== undefined && input.parentId !== null) {
    const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
    if (!parent) {
      throw AppError.badRequest('Parent category not found', ErrorCodes.CATEGORY_NOT_FOUND);
    }
    await assertNoCycle(id, input.parentId);
  }

  const slug = input.slug;
  if (slug && slug !== existing.slug) {
    const taken = await prisma.category.findUnique({ where: { slug } });
    if (taken) {
      throw AppError.conflict('A category with this slug already exists', ErrorCodes.CONFLICT_SLUG);
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(input.nameAr === undefined ? {} : { nameAr: sanitizePlainText(input.nameAr) }),
      ...(input.nameEn === undefined ? {} : { nameEn: sanitizePlainText(input.nameEn) }),
      ...(slug === undefined ? {} : { slug }),
      ...(input.descriptionAr === undefined
        ? {}
        : { descriptionAr: input.descriptionAr ? sanitizePlainText(input.descriptionAr) : null }),
      ...(input.descriptionEn === undefined
        ? {}
        : { descriptionEn: input.descriptionEn ? sanitizePlainText(input.descriptionEn) : null }),
      ...(input.imageUrl === undefined ? {} : { imageUrl: input.imageUrl }),
      ...(input.icon === undefined ? {} : { icon: input.icon }),
      ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      ...(input.seoTitleAr === undefined ? {} : { seoTitleAr: input.seoTitleAr }),
      ...(input.seoTitleEn === undefined ? {} : { seoTitleEn: input.seoTitleEn }),
      ...(input.seoDescriptionAr === undefined ? {} : { seoDescriptionAr: input.seoDescriptionAr }),
      ...(input.seoDescriptionEn === undefined ? {} : { seoDescriptionEn: input.seoDescriptionEn }),
    },
  });

  invalidateCatalogCache();
  const counts = await visibleProductCounts();
  return toCategoryDto(category, counts.get(category.id) ?? 0, []);
}

export async function deleteCategory(id: string): Promise<void> {
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true, _count: { select: { children: true, products: true } } },
  });
  if (!existing) {
    throw AppError.notFound('Category not found', ErrorCodes.CATEGORY_NOT_FOUND);
  }
  if (existing._count.children > 0) {
    throw AppError.conflict('Category has sub-categories; move or delete them first');
  }
  if (existing._count.products > 0) {
    throw AppError.conflict('Category has products; move or delete them first');
  }

  await prisma.category.delete({ where: { id } });
  invalidateCatalogCache();
}

export async function reorderCategories(input: AdminCategoryReorderInput) {
  const parentId = input.parentId ?? null;

  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) {
      throw AppError.badRequest('Parent category not found', ErrorCodes.CATEGORY_NOT_FOUND);
    }
  }

  const siblings = await prisma.category.findMany({
    where: { parentId },
    select: { id: true },
  });
  const siblingIds = new Set(siblings.map((sibling) => sibling.id));

  const unknown = input.orderedIds.filter((id) => !siblingIds.has(id));
  if (unknown.length > 0) {
    throw AppError.unprocessable(
      'Some ids do not belong to the given parent',
      ErrorCodes.VALIDATION_ERROR,
      { unknown },
    );
  }

  await prisma.$transaction(
    input.orderedIds.map((id, index) =>
      prisma.category.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  invalidateCatalogCache();
  return listAdminCategories();
}

export async function setCategoryActive(id: string, value?: boolean) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound('Category not found', ErrorCodes.CATEGORY_NOT_FOUND);
  }
  const isActive = value ?? !existing.isActive;
  const category = await prisma.category.update({ where: { id }, data: { isActive } });
  invalidateCatalogCache();
  const counts = await visibleProductCounts();
  return toCategoryDto(category, counts.get(category.id) ?? 0, []);
}

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------

export async function listAdminBrands(): Promise<BrandDto[]> {
  const [brands, counts] = await Promise.all([
    prisma.brand.findMany({ orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }] }),
    prisma.product.groupBy({
      by: ['brandId'],
      where: { isActive: true, brandId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const countByBrand = new Map<string, number>();
  for (const row of counts) {
    if (row.brandId) {
      countByBrand.set(row.brandId, row._count._all);
    }
  }
  return brands.map((brand) => toBrandDto(brand, countByBrand.get(brand.id) ?? 0));
}

export async function createBrand(input: AdminBrandInput): Promise<BrandDto> {
  const slug = input.slug
    ? input.slug
    : await uniqueSlug(input.nameEn, async (candidate) => {
        const existing = await prisma.brand.findUnique({ where: { slug: candidate } });
        return existing !== null;
      });

  if (input.slug) {
    const existing = await prisma.brand.findUnique({ where: { slug } });
    if (existing) {
      throw AppError.conflict('A brand with this slug already exists', ErrorCodes.CONFLICT_SLUG);
    }
  }

  const brand = await prisma.brand.create({
    data: {
      nameAr: sanitizePlainText(input.nameAr),
      nameEn: sanitizePlainText(input.nameEn),
      slug,
      logoUrl: input.logoUrl ?? null,
      descriptionAr: input.descriptionAr ? sanitizePlainText(input.descriptionAr) : null,
      descriptionEn: input.descriptionEn ? sanitizePlainText(input.descriptionEn) : null,
      websiteUrl: input.websiteUrl ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });

  invalidateCatalogCache();
  return toBrandDto(brand, 0);
}

export async function updateBrand(id: string, input: AdminBrandUpdate): Promise<BrandDto> {
  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound('Brand not found', ErrorCodes.BRAND_NOT_FOUND);
  }

  if (input.slug && input.slug !== existing.slug) {
    const taken = await prisma.brand.findUnique({ where: { slug: input.slug } });
    if (taken) {
      throw AppError.conflict('A brand with this slug already exists', ErrorCodes.CONFLICT_SLUG);
    }
  }

  const brand = await prisma.brand.update({
    where: { id },
    data: {
      ...(input.nameAr === undefined ? {} : { nameAr: sanitizePlainText(input.nameAr) }),
      ...(input.nameEn === undefined ? {} : { nameEn: sanitizePlainText(input.nameEn) }),
      ...(input.slug === undefined ? {} : { slug: input.slug }),
      ...(input.logoUrl === undefined ? {} : { logoUrl: input.logoUrl }),
      ...(input.descriptionAr === undefined
        ? {}
        : { descriptionAr: input.descriptionAr ? sanitizePlainText(input.descriptionAr) : null }),
      ...(input.descriptionEn === undefined
        ? {}
        : { descriptionEn: input.descriptionEn ? sanitizePlainText(input.descriptionEn) : null }),
      ...(input.websiteUrl === undefined ? {} : { websiteUrl: input.websiteUrl }),
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    },
  });

  invalidateCatalogCache();
  const productCount = await prisma.product.count({ where: { brandId: id, isActive: true } });
  return toBrandDto(brand, productCount);
}

export async function deleteBrand(id: string): Promise<void> {
  const existing = await prisma.brand.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw AppError.notFound('Brand not found', ErrorCodes.BRAND_NOT_FOUND);
  }
  // Products keep their rows; brandId is set to NULL by the FK (onDelete: SetNull).
  await prisma.brand.delete({ where: { id } });
  invalidateCatalogCache();
}

export async function setBrandActive(id: string, value?: boolean) {
  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound('Brand not found', ErrorCodes.BRAND_NOT_FOUND);
  }
  const isActive = value ?? !existing.isActive;
  const brand = await prisma.brand.update({ where: { id }, data: { isActive } });
  invalidateCatalogCache();
  const productCount = await prisma.product.count({ where: { brandId: id, isActive: true } });
  return toBrandDto(brand, productCount);
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

export async function listAdminBanners() {
  return prisma.banner.findMany({
    orderBy: [{ location: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

function bannerData(input: AdminBannerInput) {
  return {
    titleAr: sanitizePlainText(input.titleAr),
    titleEn: sanitizePlainText(input.titleEn),
    subtitleAr: input.subtitleAr ? sanitizePlainText(input.subtitleAr) : null,
    subtitleEn: input.subtitleEn ? sanitizePlainText(input.subtitleEn) : null,
    highlightAr: input.highlightAr ? sanitizePlainText(input.highlightAr) : null,
    highlightEn: input.highlightEn ? sanitizePlainText(input.highlightEn) : null,
    bulletsAr: input.bulletsAr.map((s) => sanitizePlainText(s)),
    bulletsEn: input.bulletsEn.map((s) => sanitizePlainText(s)),
    ctaLabelAr: input.ctaLabelAr ? sanitizePlainText(input.ctaLabelAr) : null,
    ctaLabelEn: input.ctaLabelEn ? sanitizePlainText(input.ctaLabelEn) : null,
    ctaUrl: input.ctaUrl ?? null,
    imageUrl: input.imageUrl ?? null,
    location: input.location,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
  };
}

export async function createBanner(input: AdminBannerInput) {
  const banner = await prisma.banner.create({ data: bannerData(input) });
  invalidateCatalogCache();
  return banner;
}

export async function updateBanner(id: string, input: AdminBannerUpdate) {
  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound('Banner not found', ErrorCodes.BANNER_NOT_FOUND);
  }

  const data = {
    ...(input.titleAr === undefined ? {} : { titleAr: sanitizePlainText(input.titleAr) }),
    ...(input.titleEn === undefined ? {} : { titleEn: sanitizePlainText(input.titleEn) }),
    ...(input.subtitleAr === undefined
      ? {}
      : { subtitleAr: input.subtitleAr ? sanitizePlainText(input.subtitleAr) : null }),
    ...(input.subtitleEn === undefined
      ? {}
      : { subtitleEn: input.subtitleEn ? sanitizePlainText(input.subtitleEn) : null }),
    ...(input.highlightAr === undefined
      ? {}
      : { highlightAr: input.highlightAr ? sanitizePlainText(input.highlightAr) : null }),
    ...(input.highlightEn === undefined
      ? {}
      : { highlightEn: input.highlightEn ? sanitizePlainText(input.highlightEn) : null }),
    ...(input.bulletsAr === undefined ? {} : { bulletsAr: input.bulletsAr.map((s) => sanitizePlainText(s)) }),
    ...(input.bulletsEn === undefined ? {} : { bulletsEn: input.bulletsEn.map((s) => sanitizePlainText(s)) }),
    ...(input.ctaLabelAr === undefined
      ? {}
      : { ctaLabelAr: input.ctaLabelAr ? sanitizePlainText(input.ctaLabelAr) : null }),
    ...(input.ctaLabelEn === undefined
      ? {}
      : { ctaLabelEn: input.ctaLabelEn ? sanitizePlainText(input.ctaLabelEn) : null }),
    ...(input.ctaUrl === undefined ? {} : { ctaUrl: input.ctaUrl }),
    ...(input.imageUrl === undefined ? {} : { imageUrl: input.imageUrl }),
    ...(input.location === undefined ? {} : { location: input.location }),
    ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    ...(input.startsAt === undefined ? {} : { startsAt: input.startsAt }),
    ...(input.endsAt === undefined ? {} : { endsAt: input.endsAt }),
  };

  const effectiveStartsAt = input.startsAt === undefined ? existing.startsAt : input.startsAt;
  const effectiveEndsAt = input.endsAt === undefined ? existing.endsAt : input.endsAt;
  if (effectiveStartsAt && effectiveEndsAt && effectiveStartsAt >= effectiveEndsAt) {
    throw AppError.unprocessable('startsAt must be before endsAt');
  }

  const banner = await prisma.banner.update({ where: { id }, data });
  invalidateCatalogCache();
  return banner;
}

export async function deleteBanner(id: string): Promise<void> {
  const existing = await prisma.banner.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw AppError.notFound('Banner not found', ErrorCodes.BANNER_NOT_FOUND);
  }
  await prisma.banner.delete({ where: { id } });
  invalidateCatalogCache();
}

export async function reorderBanners(orderedIds: string[]) {
  const banners = await prisma.banner.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true },
  });
  const found = new Set(banners.map((banner) => banner.id));
  const missing = orderedIds.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw AppError.unprocessable('Some banner ids do not exist', ErrorCodes.VALIDATION_ERROR, {
      missing,
    });
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.banner.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  invalidateCatalogCache();
  return listAdminBanners();
}
