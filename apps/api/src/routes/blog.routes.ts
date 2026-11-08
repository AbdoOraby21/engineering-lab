import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { sendData } from '../utils/http.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import {
  listBlogPosts,
  getBlogPostBySlug,
  listBlogCategories,
  listBlogTags,
} from '../services/blog.service.js';

const router = Router();

const listQuery = z.object({
  category: z.string().trim().min(1).max(160).optional(),
  tag: z.string().trim().min(1).max(80).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  lang: z.enum(['ar', 'en']).default('en'),
});

router.get(
  '/posts',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const result = await listBlogPosts(req.query as unknown as Parameters<typeof listBlogPosts>[0]);
    sendData(res, result);
  }),
);

router.get(
  '/posts/:slug',
  validate({ params: z.object({ slug: z.string().min(1).max(160) }) }),
  asyncHandler(async (req, res) => {
    const post = await getBlogPostBySlug(req.params.slug!, {
      lang: (req.query.lang as 'ar' | 'en' | undefined) ?? 'en',
      incrementViews: true,
    });
    if (!post) {
      throw AppError.notFound('Post not found', ErrorCodes.NOT_FOUND);
    }
    sendData(res, { post });
  }),
);

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await listBlogCategories();
    sendData(res, { categories });
  }),
);

router.get(
  '/tags',
  asyncHandler(async (_req, res) => {
    const tags = await listBlogTags();
    sendData(res, { tags });
  }),
);

export default router;
