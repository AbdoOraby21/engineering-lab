import { Router } from 'express';
import {
  autocompleteQuerySchema,
  byIdsQuerySchema,
  catalogLangQuerySchema,
  catalogLimitQuerySchema,
  createReviewSchema,
  productListQuerySchema,
  reviewListQuerySchema,
  slugParamSchema,
  updateReviewSchema,
  type AutocompleteQuery,
  type ByIdsQuery,
  type CatalogLangQuery,
  type CatalogLimitQuery,
  type CreateReviewInput,
  type ProductListQuery,
  type ReviewListQuery,
  type SlugParam,
  type UpdateReviewInput,
} from '@engineering-lab/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendData } from '../utils/http.js';
import { cached, CATALOG_CACHE_TTL_SECONDS } from '../utils/cache.js';
import { listBrands, getCategoryBySlug, listCategoryTree } from '../services/catalog/category.service.js';
import {
  getBestSellers,
  getFeaturedProducts,
  getNewArrivals,
  getProductBySlug,
  getProductsByIds,
  getRelatedProducts,
  listProducts,
  suggest,
} from '../services/catalog/product.service.js';
import {
  createReview,
  deleteReview,
  listProductReviews,
  updateReview,
} from '../services/catalog/review.service.js';

const router = Router();

function slugOf(params: unknown): string {
  return (params as SlugParam).slug;
}

function cacheKey(prefix: string, req: { params: unknown; query: unknown }): string {
  return `${prefix}:${JSON.stringify(req.params)}:${JSON.stringify(req.query)}`;
}

async function sendCategoryTree(res: Parameters<typeof sendData>[0]): Promise<void> {
  const categories = await cached('categories:tree', CATALOG_CACHE_TTL_SECONDS, () =>
    listCategoryTree(),
  );
  sendData(res, { categories });
}

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    await sendCategoryTree(res);
  }),
);

// Spec alias: GET /categories/tree (must be declared before /categories/:slug).
router.get(
  '/categories/tree',
  asyncHandler(async (_req, res) => {
    await sendCategoryTree(res);
  }),
);

router.get(
  '/categories/:slug',
  validate({ params: slugParamSchema }),
  asyncHandler(async (req, res) => {
    const category = await cached(cacheKey('categories:detail', req), CATALOG_CACHE_TTL_SECONDS, () =>
      getCategoryBySlug(slugOf(req.params)),
    );
    sendData(res, { category });
  }),
);

router.get(
  '/brands',
  asyncHandler(async (_req, res) => {
    const brands = await cached('brands:list', CATALOG_CACHE_TTL_SECONDS, () => listBrands());
    sendData(res, { brands });
  }),
);

router.get(
  '/products',
  validate({ query: productListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ProductListQuery;
    const result = await cached(cacheKey('products:list', req), CATALOG_CACHE_TTL_SECONDS, () =>
      listProducts(query),
    );
    sendData(res, result);
  }),
);

router.get(
  '/products/autocomplete',
  validate({ query: autocompleteQuerySchema }),
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query as unknown as AutocompleteQuery;
    const suggestions = await suggest(q, limit);
    sendData(res, { suggestions });
  }),
);

router.get(
  '/products/by-ids',
  validate({ query: byIdsQuerySchema }),
  asyncHandler(async (req, res) => {
    const { ids, lang } = req.query as unknown as ByIdsQuery;
    const products = await getProductsByIds(ids, { lang });
    sendData(res, { products });
  }),
);

router.get(
  '/products/featured',
  validate({ query: catalogLimitQuerySchema }),
  asyncHandler(async (req, res) => {
    const { limit, lang } = req.query as unknown as CatalogLimitQuery;
    const products = await cached(cacheKey('products:featured', req), CATALOG_CACHE_TTL_SECONDS, () =>
      getFeaturedProducts(limit, { lang }),
    );
    sendData(res, { products });
  }),
);

router.get(
  '/products/new-arrivals',
  validate({ query: catalogLimitQuerySchema }),
  asyncHandler(async (req, res) => {
    const { limit, lang } = req.query as unknown as CatalogLimitQuery;
    const products = await cached(cacheKey('products:new-arrivals', req), CATALOG_CACHE_TTL_SECONDS, () =>
      getNewArrivals(limit, { lang }),
    );
    sendData(res, { products });
  }),
);

router.get(
  '/products/best-sellers',
  validate({ query: catalogLimitQuerySchema }),
  asyncHandler(async (req, res) => {
    const { limit, lang } = req.query as unknown as CatalogLimitQuery;
    const products = await cached(cacheKey('products:best-sellers', req), CATALOG_CACHE_TTL_SECONDS, () =>
      getBestSellers(limit, { lang }),
    );
    sendData(res, { products });
  }),
);

// Spec aliases: /products/lists/* (max 12 items each).
router.get(
  '/products/lists/featured',
  validate({ query: catalogLimitQuerySchema }),
  asyncHandler(async (req, res) => {
    const { limit, lang } = req.query as unknown as CatalogLimitQuery;
    const products = await cached(cacheKey('products:featured', req), CATALOG_CACHE_TTL_SECONDS, () =>
      getFeaturedProducts(Math.min(limit, 12), { lang }),
    );
    sendData(res, { products });
  }),
);

router.get(
  '/products/lists/new-arrivals',
  validate({ query: catalogLimitQuerySchema }),
  asyncHandler(async (req, res) => {
    const { limit, lang } = req.query as unknown as CatalogLimitQuery;
    const products = await cached(cacheKey('products:new-arrivals', req), CATALOG_CACHE_TTL_SECONDS, () =>
      getNewArrivals(Math.min(limit, 12), { lang }),
    );
    sendData(res, { products });
  }),
);

router.get(
  '/products/lists/best-sellers',
  validate({ query: catalogLimitQuerySchema }),
  asyncHandler(async (req, res) => {
    const { limit, lang } = req.query as unknown as CatalogLimitQuery;
    const products = await cached(cacheKey('products:best-sellers', req), CATALOG_CACHE_TTL_SECONDS, () =>
      getBestSellers(Math.min(limit, 12), { lang }),
    );
    sendData(res, { products });
  }),
);

router.get(
  '/products/:slug/related',
  validate({ params: slugParamSchema, query: catalogLimitQuerySchema }),
  asyncHandler(async (req, res) => {
    const { limit, lang } = req.query as unknown as CatalogLimitQuery;
    const products = await getRelatedProducts(slugOf(req.params), limit, { lang });
    sendData(res, { products });
  }),
);

router.get(
  '/products/:slug/reviews',
  validate({ params: slugParamSchema, query: reviewListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await listProductReviews(
      slugOf(req.params),
      req.query as unknown as ReviewListQuery,
    );
    sendData(res, result);
  }),
);

router.post(
  '/products/:slug/reviews',
  requireAuth,
  validate({ params: slugParamSchema, body: createReviewSchema }),
  asyncHandler(async (req, res) => {
    const review = await createReview(
      req.authUser!.id,
      slugOf(req.params),
      req.body as CreateReviewInput,
    );
    sendData(res, { review }, 201);
  }),
);

router.patch(
  '/reviews/:id',
  requireAuth,
  validate({ body: updateReviewSchema }),
  asyncHandler(async (req, res) => {
    const review = await updateReview(
      req.authUser!.id,
      String(req.params.id),
      req.body as UpdateReviewInput,
    );
    sendData(res, { review });
  }),
);

router.delete(
  '/reviews/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await deleteReview(req.authUser!.id, String(req.params.id));
    sendData(res, { deleted: true });
  }),
);

router.get(
  '/products/:slug',
  validate({ params: slugParamSchema, query: catalogLangQuerySchema }),
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { lang } = req.query as unknown as CatalogLangQuery;
    const product = await getProductBySlug(slugOf(req.params), {
      viewerId: req.authUser?.id,
      lang,
    });
    sendData(res, { product });
  }),
);

export default router;
