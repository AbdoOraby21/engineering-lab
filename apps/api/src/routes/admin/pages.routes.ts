import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/http.js';
import { prisma } from '../../lib/prisma.js';
import { writeAuditLog } from '../../services/admin/audit.service.js';
import { AppError, ErrorCodes } from '../../utils/errors.js';
import { sanitizeRichText } from '../../utils/sanitize.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

const pageParams = z.object({ slug: z.string().min(1).max(160) });

const pageBodySchema = z.object({
  titleAr: z.string().trim().min(1, 'Title is required').max(200),
  titleEn: z.string().trim().min(1, 'Title is required').max(200),
  contentAr: z.string().trim().max(20000),
  contentEn: z.string().trim().max(20000),
  isPublished: z.boolean().default(true),
});

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const pages = await prisma.page.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        titleAr: true,
        titleEn: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    sendData(res, { pages });
  }),
);

router.get(
  '/:slug',
  validate({ params: pageParams }),
  asyncHandler(async (req, res) => {
    const page = await prisma.page.findUnique({ where: { slug: req.params.slug! } });
    if (!page) {
      throw AppError.notFound('Page not found', ErrorCodes.PAGE_NOT_FOUND);
    }
    sendData(res, { page });
  }),
);

router.put(
  '/:slug',
  validate({ params: pageParams, body: pageBodySchema }),
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const existing = await prisma.page.findUnique({ where: { slug: slug! } });
    if (!existing) {
      throw AppError.notFound('Page not found', ErrorCodes.PAGE_NOT_FOUND);
    }

    const before = {
      titleAr: existing.titleAr,
      titleEn: existing.titleEn,
      contentAr: existing.contentAr,
      contentEn: existing.contentEn,
      isPublished: existing.isPublished,
    };
    const after = {
      titleAr: req.body.titleAr,
      titleEn: req.body.titleEn,
      contentAr: sanitizeRichText(req.body.contentAr),
      contentEn: sanitizeRichText(req.body.contentEn),
      isPublished: req.body.isPublished,
    };

    const page = await prisma.page.update({
      where: { slug: slug! },
      data: after,
    });

    await writeAuditLog({
      actorId: req.authUser!.id,
      action: 'PAGE.UPDATE',
      entity: 'Page',
      entityId: page.id,
      before,
      after,
      ip: req.ip ?? undefined,
      userAgent: req.get('user-agent') ?? undefined,
    });

    sendData(res, { page });
  }),
);

export default router;
