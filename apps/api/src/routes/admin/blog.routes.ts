import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/http.js';
import { AppError, ErrorCodes } from '../../utils/errors.js';
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  listBlogPostsAdmin,
  publishScheduledPosts,
} from '../../services/blog.service.js';
import { writeAuditLog } from '../../services/admin/audit.service.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

const postSchema = z.object({
  slug: z.string().trim().min(1).max(160),
  titleAr: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  excerptAr: z.string().trim().max(2000).nullish(),
  excerptEn: z.string().trim().max(2000).nullish(),
  contentAr: z.string().trim().min(1),
  contentEn: z.string().trim().min(1),
  coverImageUrl: z.string().trim().max(500).nullish(),
  coverAltAr: z.string().trim().max(200).nullish(),
  coverAltEn: z.string().trim().max(200).nullish(),
  categoryId: z.string().trim().min(1).max(64).nullish(),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED']),
  publishedAt: z.coerce.date().nullish(),
  readingTimeMinutes: z.coerce.number().int().min(0).optional(),
  authorId: z.string().trim().min(1).max(64).nullish(),
  seoTitleAr: z.string().trim().max(200).nullish(),
  seoTitleEn: z.string().trim().max(200).nullish(),
  seoDescriptionAr: z.string().trim().max(500).nullish(),
  seoDescriptionEn: z.string().trim().max(500).nullish(),
});

router.get(
  '/posts',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 25)));
    const status = (req.query.status as 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | undefined);
    const q = (req.query.q as string | undefined);
    const result = await listBlogPostsAdmin({ page, pageSize, status, q });
    sendData(res, result);
  }),
);

router.post(
  '/posts',
  validate({ body: postSchema }),
  asyncHandler(async (req, res) => {
    const post = await createBlogPost(req.body, req.authUser!.id);
    await writeAuditLog({
      actorId: req.authUser!.id,
      action: 'BLOG.POST_CREATE',
      entity: 'BlogPost',
      entityId: post.id,
      after: { slug: post.slug, status: post.status },
      ip: req.ip ?? undefined,
      userAgent: req.get('user-agent') ?? undefined,
    });
    sendData(res, { post }, 201);
  }),
);

router.get(
  '/posts/:id',
  validate({ params: z.object({ id: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const result = await listBlogPostsAdmin({ page: 1, pageSize: 1 });
    const post = result.posts.find((p) => p.id === req.params.id);
    if (!post) {
      throw AppError.notFound('Post not found', ErrorCodes.NOT_FOUND);
    }
    sendData(res, { post });
  }),
);

router.patch(
  '/posts/:id',
  validate({ params: z.object({ id: z.string().min(1) }), body: postSchema.partial() }),
  asyncHandler(async (req, res) => {
    const post = await updateBlogPost(req.params.id!, req.body, req.authUser!.id);
    await writeAuditLog({
      actorId: req.authUser!.id,
      action: 'BLOG.POST_UPDATE',
      entity: 'BlogPost',
      entityId: post.id,
      after: { slug: post.slug, status: post.status },
      ip: req.ip ?? undefined,
      userAgent: req.get('user-agent') ?? undefined,
    });
    sendData(res, { post });
  }),
);

router.delete(
  '/posts/:id',
  validate({ params: z.object({ id: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    await deleteBlogPost(req.params.id!);
    await writeAuditLog({
      actorId: req.authUser!.id,
      action: 'BLOG.POST_DELETE',
      entity: 'BlogPost',
      entityId: req.params.id,
      ip: req.ip ?? undefined,
      userAgent: req.get('user-agent') ?? undefined,
    });
    sendData(res, { deleted: true });
  }),
);

router.post(
  '/publish-scheduled',
  asyncHandler(async (req, res) => {
    const count = await publishScheduledPosts();
    sendData(res, { published: count });
  }),
);

export default router;
