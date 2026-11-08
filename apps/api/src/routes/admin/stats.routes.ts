import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/http.js';
import { getStatsOverview, getRevenueOverTime, getTopProducts } from '../../services/admin/stats.service.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

const rangeQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

router.get(
  '/overview',
  validate({ query: rangeQuery }),
  asyncHandler(async (req, res) => {
    const stats = await getStatsOverview(req.query.from as Date | undefined, req.query.to as Date | undefined);
    sendData(res, { stats });
  }),
);

router.get(
  '/revenue-over-time',
  validate({ query: rangeQuery }),
  asyncHandler(async (req, res) => {
    const from = req.query.from as Date | undefined;
    const to = req.query.to as Date | undefined;
    if (!from || !to) {
      const now = new Date();
      const data = await getRevenueOverTime(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), now, 'day');
      sendData(res, { data });
      return;
    }
    const data = await getRevenueOverTime(from, to, 'day');
    sendData(res, { data });
  }),
);

router.get(
  '/top-products',
  validate({ query: rangeQuery }),
  asyncHandler(async (req, res) => {
    const data = await getTopProducts(10, req.query.from as Date | undefined, req.query.to as Date | undefined);
    sendData(res, { data });
  }),
);

export default router;
