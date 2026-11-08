import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { newsletterLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { sendData } from '../utils/http.js';
import { AppError } from '../utils/errors.js';
import {
  subscribeNewsletter,
  confirmNewsletter,
  unsubscribeNewsletter,
  listNewsletterSubscribers,
  exportNewsletterSubscribersCSV,
  sendNewsletterBroadcast,
} from '../services/newsletter.service.js';
import { writeAuditLog } from '../services/admin/audit.service.js';

const router = Router();

const subscribeSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').max(254),
  locale: z.enum(['ar', 'en']).default('ar'),
  source: z.string().trim().max(40).optional(),
  honeypot: z.string().optional(),
});

router.post(
  '/subscribe',
  newsletterLimiter,
  validate({ body: subscribeSchema }),
  asyncHandler(async (req, res) => {
    const result = await subscribeNewsletter(req.body, req.ip ?? undefined);
    sendData(res, result);
  }),
);

router.get(
  '/confirm/:token',
  validate({ params: z.object({ token: z.string().min(1).max(128) }) }),
  asyncHandler(async (req, res) => {
    await confirmNewsletter(req.params.token!);
    sendData(res, { ok: true });
  }),
);

router.post(
  '/unsubscribe',
  validate({ body: z.object({ email: z.string().email(), token: z.string().optional() }) }),
  asyncHandler(async (req, res) => {
    await unsubscribeNewsletter(req.body.email, req.body.token);
    sendData(res, { ok: true });
  }),
);

export { router as publicNewsletterRoutes };

export function adminNewsletterRoutes(): Router {
  const adminRouter = Router();
  // Auth + ADMIN role are enforced by the parent /api/v1/admin mount.

  adminRouter.get(
    '/subscribers',
    asyncHandler(async (req, res) => {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 25)));
      const status = (req.query.status as 'PENDING' | 'ACTIVE' | 'UNSUBSCRIBED' | undefined);
      const result = await listNewsletterSubscribers({ page, pageSize, status });
      sendData(res, result);
    }),
  );

  adminRouter.get(
    '/subscribers/export',
    asyncHandler(async (req, res) => {
      const status = (req.query.status as string | undefined);
      const csv = await exportNewsletterSubscribersCSV(status);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
      res.send(csv);
    }),
  );

  adminRouter.post(
    '/broadcast',
    validate({
      body: z.object({
        subjectAr: z.string().trim().min(1).max(200),
        subjectEn: z.string().trim().min(1).max(200),
        bodyAr: z.string().trim().min(1),
        bodyEn: z.string().trim().min(1),
        locale: z.enum(['ar', 'en']).optional(),
      }),
    }),
    asyncHandler(async (req, res) => {
      const authUser = (req as { authUser?: { id: string } }).authUser;
      if (!authUser) {
        throw AppError.unauthorized();
      }
      const result = await sendNewsletterBroadcast({
        ...req.body,
        actorId: authUser.id,
      });
      await writeAuditLog({
        actorId: authUser.id,
        action: 'NEWSLETTER.BROADCAST',
        entity: 'Subscriber',
        after: result,
        ip: req.ip ?? undefined,
      });
      sendData(res, result);
    }),
  );

  return adminRouter;
}

export default router;
