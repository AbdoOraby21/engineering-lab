import { Router } from 'express';
import {
  adminReviewsQuerySchema,
  type AdminReviewsQuery,
} from '@engineering-lab/shared';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/http.js';
import { listAdminReviews, moderateReview } from '../../services/catalog/review.service.js';

const router = Router();

router.get(
  '/',
  validate({ query: adminReviewsQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as AdminReviewsQuery;
    const result = await listAdminReviews({
      ...(query.status ? { status: query.status } : {}),
      page: query.page,
      pageSize: query.pageSize,
    });
    sendData(res, result);
  }),
);

router.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    const review = await moderateReview(String(req.params.id), 'approve');
    sendData(res, { review });
  }),
);

router.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    const review = await moderateReview(String(req.params.id), 'reject');
    sendData(res, { review });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await moderateReview(String(req.params.id), 'delete');
    sendData(res, result);
  }),
);

export default router;
