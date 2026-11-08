import type { Brand, Category, ProductImage } from '@prisma/client';
import type {
  BannerDto,
  BrandDto,
  BrandSummaryDto,
  CategoryDto,
  CategorySummaryDto,
  ProductCardDto,
  ProductDetailDto,
  ProductImageDto,
  ProductSpecDto,
  ProductVariantDto,
  ReviewDto,
  ReviewSummaryDto,
} from '@engineering-lab/shared';
import { discountPercent } from '@engineering-lab/shared';
import { env } from '../../config/env.js';
import type { ProductCardSource, ProductDetailSource, ReviewSource } from './includes.js';

export type SerializeOptions = { lang?: 'ar' | 'en' };

export function toAbsoluteUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${env.API_PUBLIC_URL.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function toProductImage(image: ProductImage): ProductImageDto {
  return {
    id: image.id,
    url: toAbsoluteUrl(image.url) ?? image.url,
    altAr: image.altAr,
    altEn: image.altEn,
    sortOrder: image.sortOrder,
  };
}

export function toBrandSummary(brand: Brand): BrandSummaryDto {
  return {
    id: brand.id,
    nameAr: brand.nameAr,
    nameEn: brand.nameEn,
    slug: brand.slug,
    logoUrl: toAbsoluteUrl(brand.logoUrl),
  };
}

export function toBrandDto(brand: Brand, productCount: number): BrandDto {
  return {
    ...toBrandSummary(brand),
    descriptionAr: brand.descriptionAr,
    descriptionEn: brand.descriptionEn,
    websiteUrl: brand.websiteUrl,
    sortOrder: brand.sortOrder,
    isActive: brand.isActive,
    productCount,
  };
}

export function toCategorySummary(category: Category): CategorySummaryDto {
  return {
    id: category.id,
    nameAr: category.nameAr,
    nameEn: category.nameEn,
    slug: category.slug,
  };
}

export function toCategoryDto(
  category: Category,
  productCount: number,
  children: CategoryDto[],
): CategoryDto {
  return {
    ...toCategorySummary(category),
    descriptionAr: category.descriptionAr,
    descriptionEn: category.descriptionEn,
    imageUrl: toAbsoluteUrl(category.imageUrl),
    icon: category.icon,
    parentId: category.parentId,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    productCount,
    children,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseSpecs(value: unknown): ProductSpecDto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const specs: ProductSpecDto[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }
    const { keyAr, keyEn, valueAr, valueEn } = entry;
    if (
      typeof keyAr === 'string' &&
      typeof keyEn === 'string' &&
      typeof valueAr === 'string' &&
      typeof valueEn === 'string'
    ) {
      specs.push({ keyAr, keyEn, valueAr, valueEn });
    }
  }
  return specs;
}

function pickPrimaryImage(images: ProductImage[]): ProductImage | undefined {
  return images.find((image) => image.isPrimary) ?? images[0];
}

export function toProductCard(
  product: ProductCardSource,
  options: SerializeOptions = {},
): ProductCardDto {
  const primary = pickPrimaryImage(product.images);
  const secondary = product.images.find((image) => image.id !== primary?.id);
  const card: ProductCardDto = {
    id: product.id,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    slug: product.slug,
    sku: product.sku,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    discountPercent: discountPercent(product.price, product.compareAtPrice),
    stock: product.stock,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    isBundle: product.type === 'BUNDLE',
    type: product.type,
    ratingAverage: product.ratingAverage,
    ratingCount: product.ratingCount,
    soldCount: product.soldCount,
    tags: product.tags,
    primaryImage: primary ? toProductImage(primary) : null,
    secondaryImage: secondary ? toProductImage(secondary) : null,
    brand: product.brand ? toBrandSummary(product.brand) : null,
    category: toCategorySummary(product.category),
  };

  if (options.lang === 'ar') {
    card.name = product.nameAr;
    card.shortDescription = product.shortDescriptionAr;
  } else if (options.lang === 'en') {
    card.name = product.nameEn;
    card.shortDescription = product.shortDescriptionEn;
  }

  return card;
}

export function toVariantDto(
  variant: ProductDetailSource['variants'][number],
): ProductVariantDto {
  return {
    id: variant.id,
    nameAr: variant.nameAr,
    nameEn: variant.nameEn,
    sku: variant.sku,
    priceDelta: variant.priceDelta,
    stock: variant.stock,
    isActive: variant.isActive,
    sortOrder: variant.sortOrder,
  };
}

export interface ProductDetailExtras {
  availableStock: number;
  ratingSummary: ReviewSummaryDto;
  breadcrumb: CategorySummaryDto[];
  isInWishlist?: boolean;
  canReview?: boolean;
}

export function toProductDetail(
  product: ProductDetailSource,
  extras: ProductDetailExtras,
  options: SerializeOptions = {},
): ProductDetailDto {
  const { availableStock, ratingSummary, breadcrumb, isInWishlist, canReview } = extras;

  const detail: ProductDetailDto = {
    ...toProductCard(product, options),
    descriptionAr: product.descriptionAr,
    descriptionEn: product.descriptionEn,
    shortDescriptionAr: product.shortDescriptionAr,
    shortDescriptionEn: product.shortDescriptionEn,
    weightGrams: product.weightGrams,
    lowStockThreshold: product.lowStockThreshold,
    datasheetUrl: toAbsoluteUrl(product.datasheetUrl),
    specs: parseSpecs(product.specs),
    images: product.images.map(toProductImage),
    variants: product.variants.map(toVariantDto),
    bundleItems: product.bundleItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      component: toProductCard(item.component),
    })),
    availableStock,
    ratingSummary,
    breadcrumb,
    ...(isInWishlist === undefined ? {} : { isInWishlist }),
    ...(canReview === undefined ? {} : { canReview }),
    seoTitleAr: product.seoTitleAr,
    seoTitleEn: product.seoTitleEn,
    seoDescriptionAr: product.seoDescriptionAr,
    seoDescriptionEn: product.seoDescriptionEn,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };

  if (options.lang === 'ar') {
    detail.description = product.descriptionAr;
  } else if (options.lang === 'en') {
    detail.description = product.descriptionEn;
  }

  return detail;
}

export function toReviewDto(review: ReviewSource): ReviewDto {
  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    status: review.status,
    isVerifiedPurchase: review.isVerifiedPurchase,
    createdAt: review.createdAt.toISOString(),
    user: {
      id: review.user.id,
      name: review.user.name,
    },
  };
}

export function toBannerDto(banner: {
  id: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string | null;
  subtitleEn: string | null;
  highlightAr: string | null;
  highlightEn: string | null;
  bulletsAr: string[];
  bulletsEn: string[];
  ctaLabelAr: string | null;
  ctaLabelEn: string | null;
  imageUrl: string | null;
  ctaUrl: string | null;
  location: 'HOME_HERO' | 'HOME_STRIP';
  sortOrder: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}): BannerDto {
  return {
    id: banner.id,
    titleAr: banner.titleAr,
    titleEn: banner.titleEn,
    subtitleAr: banner.subtitleAr,
    subtitleEn: banner.subtitleEn,
    highlightAr: banner.highlightAr,
    highlightEn: banner.highlightEn,
    bulletsAr: banner.bulletsAr,
    bulletsEn: banner.bulletsEn,
    ctaLabelAr: banner.ctaLabelAr,
    ctaLabelEn: banner.ctaLabelEn,
    imageUrl: toAbsoluteUrl(banner.imageUrl),
    href: banner.ctaUrl,
    ctaUrl: banner.ctaUrl,
    location: banner.location,
    sortOrder: banner.sortOrder,
    isActive: banner.isActive,
    startsAt: banner.startsAt?.toISOString() ?? null,
    endsAt: banner.endsAt?.toISOString() ?? null,
  };
}
