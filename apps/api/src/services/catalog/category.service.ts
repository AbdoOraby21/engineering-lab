import { Prisma, type Category } from '@prisma/client';
import type {
  BrandDto,
  CategoryDetailDto,
  CategoryDto,
  CategorySummaryDto,
  ProductFacets,
} from '@engineering-lab/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError, ErrorCodes } from '../../utils/errors.js';
import {
  toBrandDto,
  toCategoryDto,
  toCategorySummary,
  toAbsoluteUrl,
} from './serializers.js';
import { getVisibleCategoryIds, publicProductSql } from './visibility.js';

async function visibleProductCounts(categoryIds?: string[]): Promise<Map<string, number>> {
  const visibleIds = await getVisibleCategoryIds();
  const visibleSet = new Set(visibleIds);
  const ids = categoryIds
    ? categoryIds.filter((id) => visibleSet.has(id))
    : visibleIds;
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    categoryId: { in: ids },
    OR: [{ brandId: null }, { brand: { isActive: true } }],
  };
  const counts = await prisma.product.groupBy({
    by: ['categoryId'],
    where,
    _count: { _all: true },
  });
  return new Map(counts.map((row) => [row.categoryId, row._count._all]));
}

export async function listCategoryTree(): Promise<CategoryDto[]> {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
    }),
    visibleProductCounts(),
  ]);

  const byParent = new Map<string | null, Category[]>();
  for (const category of categories) {
    const siblings = byParent.get(category.parentId) ?? [];
    siblings.push(category);
    byParent.set(category.parentId, siblings);
  }

  const build = (category: Category): CategoryDto => {
    const children = (byParent.get(category.id) ?? []).map(build);
    return toCategoryDto(category, counts.get(category.id) ?? 0, children);
  };

  return (byParent.get(null) ?? []).map(build);
}

function categorySubtreeIds(rootId: string, all: Category[]): string[] {
  const ids = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const category of all) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        const parent = all.find((entry) => entry.id === category.parentId);
        if (category.isActive && parent?.isActive) {
          ids.add(category.id);
          added = true;
        }
      }
    }
  }
  return [...ids];
}

async function loadCategoryFacets(categoryIds: string[]): Promise<ProductFacets> {
  if (categoryIds.length === 0) {
    return { brands: [], price: null, inStockCount: 0 };
  }

  const joinIds = Prisma.join(categoryIds);

  const [priceRows, brandRows] = await Promise.all([
    prisma.$queryRaw<Array<{ inStockCount: number; minPrice: number | null; maxPrice: number | null }>>(
      Prisma.sql`
        SELECT
          count(*) FILTER (WHERE (
            p."stock" > 0
            OR EXISTS (
              SELECT 1 FROM "ProductVariant" v
              WHERE v."productId" = p."id" AND v."isActive" = true AND v."stock" > 0
            )
          ))::int AS "inStockCount",
          min(p."price")::int AS "minPrice",
          max(p."price")::int AS "maxPrice"
        FROM "Product" p
        WHERE ${publicProductSql()} AND p."categoryId" IN (${joinIds})
      `,
    ),
    prisma.$queryRaw<Array<{ id: string; count: number }>>(
      Prisma.sql`
        SELECT p."brandId" AS id, count(*)::int AS count
        FROM "Product" p
        WHERE ${publicProductSql()} AND p."categoryId" IN (${joinIds}) AND p."brandId" IS NOT NULL
        GROUP BY p."brandId"
      `,
    ),
  ]);

  const brandIds = brandRows.map((row) => row.id);
  const brands =
    brandIds.length === 0
      ? []
      : await prisma.brand.findMany({
          where: { id: { in: brandIds }, isActive: true },
          orderBy: { nameEn: 'asc' },
        });
  const countByBrand = new Map(brandRows.map((row) => [row.id, row.count]));

  const priceRow = priceRows[0];
  return {
    brands: brands.map((brand) => ({
      slug: brand.slug,
      nameAr: brand.nameAr,
      nameEn: brand.nameEn,
      logoUrl: toAbsoluteUrl(brand.logoUrl),
      count: countByBrand.get(brand.id) ?? 0,
    })),
    price:
      priceRow && priceRow.minPrice !== null && priceRow.maxPrice !== null
        ? { min: priceRow.minPrice, max: priceRow.maxPrice }
        : null,
    inStockCount: priceRow?.inStockCount ?? 0,
  };
}

export async function getCategoryBySlug(slug: string): Promise<CategoryDetailDto> {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
    }),
    visibleProductCounts(),
  ]);

  const category = categories.find((entry) => entry.slug === slug && entry.isActive);
  if (!category) {
    throw AppError.notFound('Category not found', ErrorCodes.CATEGORY_NOT_FOUND);
  }

  const byId = new Map(categories.map((entry) => [entry.id, entry]));
  const breadcrumb: CategorySummaryDto[] = [];
  let current: Category | undefined = category;
  const visited = new Set<string>();
  while (current) {
    breadcrumb.unshift(toCategorySummary(current));
    if (!current.parentId || visited.has(current.parentId)) {
      break;
    }
    visited.add(current.parentId);
    current = byId.get(current.parentId);
  }

  const children = categories
    .filter((entry) => entry.parentId === category.id && entry.isActive)
    .map((entry) => toCategoryDto(entry, counts.get(entry.id) ?? 0, []));

  const subtreeIds = categorySubtreeIds(category.id, categories);
  const facets = await loadCategoryFacets(subtreeIds);

  return {
    ...toCategoryDto(category, counts.get(category.id) ?? 0, children),
    breadcrumb,
    facets,
  };
}

export async function listBrands(): Promise<BrandDto[]> {
  const [brands, counts] = await Promise.all([
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
    }),
    prisma.product.groupBy({
      by: ['brandId'],
      where: {
        isActive: true,
        brandId: { not: null },
        categoryId: { in: await getVisibleCategoryIds() },
        OR: [{ brandId: null }, { brand: { isActive: true } }],
      },
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
