import { Prisma } from '@prisma/client';
import type {
  AutocompleteSuggestionDto,
  Locale,
  ProductCardDto,
  ProductDetailDto,
  ProductFacets,
  ProductListQuery,
  ProductListResult,
  ProductSort,
  SuggestionKind,
} from '@engineering-lab/shared';
import { normalizeSearchText } from '@engineering-lab/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError, ErrorCodes } from '../../utils/errors.js';
import { paginationMeta } from '../../utils/pagination.js';
import {
  cached,
  SUGGEST_CACHE_TTL_SECONDS,
} from '../../utils/cache.js';
import { availableStock } from '../inventory.service.js';
import { productCardInclude, productDetailInclude, type ProductCardSource } from './includes.js';
import {
  toAbsoluteUrl,
  toProductCard,
  toProductDetail,
} from './serializers.js';
import { getRatingSummary } from './review.service.js';
import { purchaseVerifier } from '../purchase-verifier.js';
import { publicProductSql, publicProductWhereAsync, inStockSql } from './visibility.js';

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

interface SearchPlan {
  tsquery: string | null;
  normalized: string;
  raw: string;
  rawPattern: string;
  normalizedPattern: string;
}

function buildSearchPlan(query: string): SearchPlan | null {
  const raw = query.trim();
  if (!raw) {
    return null;
  }
  const normalized = normalizeSearchText(raw);
  const tokens = normalized
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.replace(/[':&|!()]/g, ''))
    .filter((token) => token.length >= 2);

  return {
    tsquery: tokens.length > 0 ? tokens.map((token) => `${token}:*`).join(' & ') : null,
    normalized,
    raw,
    rawPattern: likePattern(raw),
    normalizedPattern: likePattern(normalized),
  };
}

function brandMatchSql(plan: SearchPlan): Prisma.Sql {
  return Prisma.sql`EXISTS (
    SELECT 1 FROM "Brand" b
    WHERE b."id" = p."brandId"
      AND (
        search_normalize(coalesce(b."nameAr", '')) ILIKE ${plan.normalizedPattern} ESCAPE '\\'
        OR search_normalize(coalesce(b."nameEn", '')) ILIKE ${plan.normalizedPattern} ESCAPE '\\'
        OR search_normalize(coalesce(b."slug", '')) ILIKE ${plan.normalizedPattern} ESCAPE '\\'
      )
  )`;
}

function categoryMatchSql(plan: SearchPlan): Prisma.Sql {
  return Prisma.sql`EXISTS (
    SELECT 1 FROM "Category" c
    WHERE c."id" = p."categoryId"
      AND (
        search_normalize(coalesce(c."nameAr", '')) ILIKE ${plan.normalizedPattern} ESCAPE '\\'
        OR search_normalize(coalesce(c."nameEn", '')) ILIKE ${plan.normalizedPattern} ESCAPE '\\'
        OR search_normalize(coalesce(c."slug", '')) ILIKE ${plan.normalizedPattern} ESCAPE '\\'
      )
  )`;
}

function searchCondition(plan: SearchPlan): Prisma.Sql {
  const fragments: Prisma.Sql[] = [
    Prisma.sql`p."searchText" ILIKE ${plan.normalizedPattern} ESCAPE '\\'`,
    Prisma.sql`p."sku" ILIKE ${plan.rawPattern} ESCAPE '\\'`,
    brandMatchSql(plan),
    categoryMatchSql(plan),
  ];
  if (plan.tsquery) {
    fragments.push(
      Prisma.sql`p."searchVector" @@ to_tsquery('simple'::regconfig, ${plan.tsquery})`,
    );
  }
  if (plan.normalized.length >= 3) {
    fragments.push(Prisma.sql`word_similarity(${plan.normalized}, p."searchText") > 0.3`);
  }
  return Prisma.sql`(${Prisma.join(fragments, ' OR ')})`;
}

function searchRank(plan: SearchPlan): Prisma.Sql {
  const textRank = plan.tsquery
    ? Prisma.sql`ts_rank_cd(p."searchVector", to_tsquery('simple'::regconfig, ${plan.tsquery}))`
    : Prisma.sql`0::float8`;
  return Prisma.sql`(
    ${textRank}
    + (CASE WHEN ${brandMatchSql(plan)} THEN 0.25 ELSE 0 END)
    + (CASE WHEN ${categoryMatchSql(plan)} THEN 0.15 ELSE 0 END)
  )`;
}

async function categoryDescendantIds(slug: string): Promise<string[] | null> {
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true, parentId: true, isActive: true },
  });
  const byId = new Map(categories.map((category) => [category.id, category]));
  const root = categories.find((category) => category.slug === slug && category.isActive);
  if (!root) {
    return null;
  }

  const ids = new Set<string>([root.id]);
  let added = true;
  while (added) {
    added = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        const parent = byId.get(category.parentId);
        // Inactive subtrees are excluded from public filtering.
        if (category.isActive && parent?.isActive) {
          ids.add(category.id);
          added = true;
        }
      }
    }
  }
  return [...ids];
}

function orderBySql(sort: ProductSort, locale: Locale): Prisma.Sql {
  switch (sort) {
    case 'oldest':
      return Prisma.sql`p."createdAt" ASC`;
    case 'price_asc':
      return Prisma.sql`p."price" ASC, p."createdAt" DESC`;
    case 'price_desc':
      return Prisma.sql`p."price" DESC, p."createdAt" DESC`;
    case 'name_asc':
      return locale === 'ar' ? Prisma.sql`p."nameAr" ASC` : Prisma.sql`p."nameEn" ASC`;
    case 'name_desc':
      return locale === 'ar' ? Prisma.sql`p."nameAr" DESC` : Prisma.sql`p."nameEn" DESC`;
    case 'popular':
    case 'popularity':
      return Prisma.sql`p."soldCount" DESC, p."createdAt" DESC`;
    case 'rating':
      return Prisma.sql`p."ratingAverage" DESC, p."ratingCount" DESC, p."soldCount" DESC`;
    case 'relevance':
      // No search term: fall back to popularity.
      return Prisma.sql`p."soldCount" DESC, p."createdAt" DESC`;
    case 'newest':
    default:
      return Prisma.sql`p."createdAt" DESC`;
  }
}

interface FilterBuild {
  base: Prisma.Sql[];
  withoutBrand: Prisma.Sql[];
}

async function buildFilters(query: ProductListQuery): Promise<FilterBuild> {
  const conditions: Prisma.Sql[] = [publicProductSql()];

  const search = query.q?.trim();
  if (search) {
    const plan = buildSearchPlan(search);
    if (plan) {
      conditions.push(searchCondition(plan));
    }
  }

  if (query.category) {
    const categoryIds = await categoryDescendantIds(query.category);
    conditions.push(
      categoryIds && categoryIds.length > 0
        ? Prisma.sql`p."categoryId" IN (${Prisma.join(categoryIds)})`
        : Prisma.sql`FALSE`,
    );
  }

  if (query.minPrice !== undefined) {
    conditions.push(Prisma.sql`p."price" >= ${query.minPrice}`);
  }
  if (query.maxPrice !== undefined) {
    conditions.push(Prisma.sql`p."price" <= ${query.maxPrice}`);
  }
  if (query.inStock === true) {
    conditions.push(inStockSql());
  }
  if (query.minRating !== undefined) {
    conditions.push(Prisma.sql`p."ratingAverage" >= ${query.minRating}`);
  }
  if (query.featured === true) {
    conditions.push(Prisma.sql`p."isFeatured" = true`);
  }
  if (query.isNew === true) {
    conditions.push(Prisma.sql`p."isNew" = true`);
  }
  if (query.onSale === true) {
    conditions.push(Prisma.sql`p."compareAtPrice" IS NOT NULL AND p."compareAtPrice" > p."price"`);
  }
  if (query.type) {
    conditions.push(Prisma.sql`p."type" = ${query.type}::"ProductType"`);
  }

  // Facets are computed with all filters except the brand filter itself,
  // so the brand list stays stable while narrowing results.
  const withoutBrand = [...conditions];

  if (query.brand && query.brand.length > 0) {
    const brands = await prisma.brand.findMany({
      where: { slug: { in: query.brand }, isActive: true },
      select: { id: true },
    });
    conditions.push(
      brands.length > 0
        ? Prisma.sql`p."brandId" IN (${Prisma.join(brands.map((brand) => brand.id))})`
        : Prisma.sql`FALSE`,
    );
  }

  return { base: conditions, withoutBrand };
}

async function hydrateCards(
  ids: string[],
  options: { lang?: 'ar' | 'en' },
): Promise<ProductCardDto[]> {
  if (ids.length === 0) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: productCardInclude,
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  return ids
    .map((id) => byId.get(id))
    .filter((product): product is ProductCardSource => product !== undefined)
    .map((product) => toProductCard(product, options));
}

async function loadFacets(withoutBrand: Prisma.Sql[]): Promise<ProductFacets> {
  const whereSql = Prisma.join(withoutBrand, ' AND ');

  const [totals, brandRows] = await Promise.all([
    prisma.$queryRaw<Array<{ inStockCount: number; minPrice: number | null; maxPrice: number | null }>>(
      Prisma.sql`
        SELECT
          count(*) FILTER (WHERE ${inStockSql()})::int AS "inStockCount",
          min(p."price")::int AS "minPrice",
          max(p."price")::int AS "maxPrice"
        FROM "Product" p
        WHERE ${whereSql}
      `,
    ),
    prisma.$queryRaw<Array<{ slug: string; nameAr: string; nameEn: string; logoUrl: string | null; count: number }>>(
      Prisma.sql`
        SELECT b.slug, b."nameAr", b."nameEn", b."logoUrl", count(*)::int AS count
        FROM "Product" p
        JOIN "Brand" b ON b."id" = p."brandId" AND b."isActive" = true
        WHERE ${whereSql} AND p."brandId" IS NOT NULL
        GROUP BY b.slug, b."nameAr", b."nameEn", b."logoUrl"
        ORDER BY count DESC, b."nameEn" ASC
        LIMIT 24
      `,
    ),
  ]);

  const totalsRow = totals[0];
  return {
    brands: brandRows.map((row) => ({
      slug: row.slug,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      logoUrl: toAbsoluteUrl(row.logoUrl),
      count: row.count,
    })),
    price:
      totalsRow && totalsRow.minPrice !== null && totalsRow.maxPrice !== null
        ? { min: totalsRow.minPrice, max: totalsRow.maxPrice }
        : null,
    inStockCount: totalsRow?.inStockCount ?? 0,
  };
}

export async function listProducts(query: ProductListQuery): Promise<ProductListResult> {
  const search = query.q?.trim();
  const hasSearch = Boolean(search);
  const sort: ProductSort = query.sort ?? (hasSearch ? 'relevance' : 'newest');
  const offset = (query.page - 1) * query.pageSize;
  const lang = query.lang;

  const { base, withoutBrand } = await buildFilters(query);
  const whereSql = Prisma.join(base, ' AND ');
  const plan = search ? buildSearchPlan(search) : null;
  const rankSql = plan ? searchRank(plan) : Prisma.sql`0::float8`;
  const skuExact = search ?? '';

  const orderSql =
    sort === 'relevance' && plan
      ? Prisma.sql`(CASE WHEN lower(p."sku") = lower(${skuExact}) THEN 1 ELSE 0 END) DESC, ${rankSql} DESC, p."soldCount" DESC, p."createdAt" DESC`
      : orderBySql(sort, query.locale);

  const [rows, countRows, facets] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT p.id
      FROM "Product" p
      WHERE ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ${query.pageSize} OFFSET ${offset}
    `),
    prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "Product" p
      WHERE ${whereSql}
    `),
    loadFacets(withoutBrand),
  ]);

  const total = countRows[0]?.count ?? 0;
  const items = await hydrateCards(
    rows.map((row) => row.id),
    { lang },
  );

  return {
    items,
    pagination: paginationMeta(query.page, query.pageSize, total),
    facets,
  };
}

export interface DetailContext {
  viewerId?: string;
  lang?: 'ar' | 'en';
}

export async function getProductBySlug(
  slug: string,
  context: DetailContext = {},
): Promise<ProductDetailDto> {
  const product = await prisma.product.findFirst({
    where: { slug, ...(await publicProductWhereAsync()) },
    include: productDetailInclude,
  });
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  const bundleItems = product.bundleItems;

  const [ratingSummary, breadcrumb, wishlistEntry] = await Promise.all([
    getRatingSummary(product.id),
    loadBreadcrumb(product.category.id),
    context.viewerId
      ? prisma.wishlistItem.findUnique({
          where: { userId_productId: { userId: context.viewerId, productId: product.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const canReview = context.viewerId
    ? await purchaseVerifier.canReview(context.viewerId, product.id)
    : false;

  const available = availableStock({
    type: product.type,
    stock: product.stock,
    reservedStock: product.reservedStock,
    variants: product.variants.map((variant) => ({
      stock: variant.stock,
      isActive: variant.isActive,
    })),
    bundleItems: bundleItems.map((item) => ({
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

  // Hide inactive bundle components from the public payload; availability
  // above is still computed from all components.
  const visibleBundleItems = bundleItems.filter((item) => item.component.isActive);

  return toProductDetail(
    { ...product, bundleItems: visibleBundleItems },
    {
      availableStock: available,
      ratingSummary,
      breadcrumb,
      ...(context.viewerId ? { isInWishlist: wishlistEntry !== null } : {}),
      ...(context.viewerId ? { canReview } : {}),
    },
    { lang: context.lang },
  );
}

async function loadBreadcrumb(
  categoryId: string,
): Promise<Array<{ id: string; nameAr: string; nameEn: string; slug: string }>> {
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true, nameAr: true, nameEn: true, parentId: true },
  });
  const byId = new Map(categories.map((category) => [category.id, category]));

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

export async function getRelatedProducts(
  slug: string,
  limit: number,
  options: { lang?: 'ar' | 'en' } = {},
): Promise<ProductCardDto[]> {
  const product = await prisma.product.findFirst({
    where: { slug, ...(await publicProductWhereAsync()) },
    select: { id: true, categoryId: true, brandId: true },
  });
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  const products = await prisma.product.findMany({
    where: {
      ...(await publicProductWhereAsync()),
      id: { not: product.id },
      OR: [
        { categoryId: product.categoryId },
        ...(product.brandId ? [{ brandId: product.brandId }] : []),
      ],
    },
    include: productCardInclude,
    orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
  return products.map((entry) => toProductCard(entry, options));
}

export async function getFeaturedProducts(
  limit: number,
  options: { lang?: 'ar' | 'en' } = {},
): Promise<ProductCardDto[]> {
  const products = await prisma.product.findMany({
    where: { ...(await publicProductWhereAsync()), isFeatured: true },
    include: productCardInclude,
    orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
  return products.map((entry) => toProductCard(entry, options));
}

export async function getNewArrivals(
  limit: number,
  options: { lang?: 'ar' | 'en' } = {},
): Promise<ProductCardDto[]> {
  const products = await prisma.product.findMany({
    where: { ...(await publicProductWhereAsync()) },
    include: productCardInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return products.map((entry) => toProductCard(entry, options));
}

export async function getBestSellers(
  limit: number,
  options: { lang?: 'ar' | 'en' } = {},
): Promise<ProductCardDto[]> {
  const products = await prisma.product.findMany({
    where: { ...(await publicProductWhereAsync()) },
    include: productCardInclude,
    orderBy: [{ soldCount: 'desc' }, { ratingAverage: 'desc' }],
    take: limit,
  });
  return products.map((entry) => toProductCard(entry, options));
}

export async function getProductsByIds(
  ids: string[],
  options: { lang?: 'ar' | 'en' } = {},
): Promise<ProductCardDto[]> {
  if (ids.length === 0) {
    return [];
  }
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, ...(await publicProductWhereAsync()) },
    include: productCardInclude,
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  return ids
    .map((id) => byId.get(id))
    .filter((product): product is ProductCardSource => product !== undefined)
    .map((product) => toProductCard(product, options));
}

interface ProductSuggestRow {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  price: number;
  imageUrl: string | null;
}

interface NamedSuggestRow {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
}

export async function suggest(
  rawQuery: string,
  limit = 8,
): Promise<AutocompleteSuggestionDto[]> {
  const q = rawQuery.trim();
  if (q.length < 2) {
    return [];
  }
  const boundedLimit = Math.min(Math.max(limit, 1), 8);

  return cached(`suggest:${normalizeSearchText(q)}:${boundedLimit}`, SUGGEST_CACHE_TTL_SECONDS, async () => {
    const plan = buildSearchPlan(q);
    if (!plan) {
      return [];
    }

    const productLimit = Math.max(1, Math.min(5, boundedLimit));
    const suggestRank = plan.tsquery
      ? Prisma.sql`ts_rank_cd(p."searchVector", to_tsquery('simple'::regconfig, ${plan.tsquery})) DESC NULLS LAST`
      : Prisma.sql`0::float8`;
    const rows = await prisma.$queryRaw<ProductSuggestRow[]>(Prisma.sql`
      SELECT
        p.id,
        p."nameAr" AS "nameAr",
        p."nameEn" AS "nameEn",
        p.slug,
        p.price,
        (
          SELECT i.url
          FROM "ProductImage" i
          WHERE i."productId" = p.id
          ORDER BY i."isPrimary" DESC, i."sortOrder" ASC
          LIMIT 1
        ) AS "imageUrl"
      FROM "Product" p
      WHERE ${publicProductSql()} AND ${searchCondition(plan)}
      ORDER BY
        ${suggestRank},
        p."soldCount" DESC,
        p."nameEn" ASC
      LIMIT ${productLimit}
    `);

    const remaining = boundedLimit - rows.length;
    const normalizedPattern = plan.normalizedPattern;

    let brandRows: NamedSuggestRow[] = [];
    let categoryRows: NamedSuggestRow[] = [];
    if (remaining > 0) {
      [brandRows, categoryRows] = await Promise.all([
        prisma.$queryRaw<NamedSuggestRow[]>(Prisma.sql`
          SELECT id, "nameAr", "nameEn", slug
          FROM "Brand"
          WHERE "isActive" = true
            AND (
              "nameAr" ILIKE ${normalizedPattern} ESCAPE '\'
              OR "nameEn" ILIKE ${normalizedPattern} ESCAPE '\'
              OR slug ILIKE ${normalizedPattern} ESCAPE '\'
              OR word_similarity(${normalizeSearchText(q)}, search_normalize("nameAr")) > 0.3
              OR word_similarity(${normalizeSearchText(q)}, search_normalize("nameEn")) > 0.3
            )
          ORDER BY "nameEn" ASC
          LIMIT ${Math.min(2, remaining)}
        `),
        prisma.$queryRaw<NamedSuggestRow[]>(Prisma.sql`
          SELECT id, "nameAr", "nameEn", slug
          FROM "Category"
          WHERE "isActive" = true
            AND (
              "nameAr" ILIKE ${normalizedPattern} ESCAPE '\'
              OR "nameEn" ILIKE ${normalizedPattern} ESCAPE '\'
              OR slug ILIKE ${normalizedPattern} ESCAPE '\'
              OR word_similarity(${normalizeSearchText(q)}, search_normalize("nameAr")) > 0.3
              OR word_similarity(${normalizeSearchText(q)}, search_normalize("nameEn")) > 0.3
            )
          ORDER BY "sortOrder" ASC, "nameEn" ASC
          LIMIT ${Math.min(2, remaining)}
        `),
      ]);
    }

    const suggestions: AutocompleteSuggestionDto[] = rows.map((row) => ({
      kind: 'product' as SuggestionKind,
      id: row.id,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      slug: row.slug,
      price: row.price,
      imageUrl: toAbsoluteUrl(row.imageUrl),
    }));

    for (const brand of brandRows) {
      suggestions.push({ kind: 'brand', ...brand });
    }
    for (const category of categoryRows) {
      suggestions.push({ kind: 'category', ...category });
    }

    return suggestions.slice(0, boundedLimit);
  });
}
