import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/http.js';
import { globalSearch } from '../../services/admin/search.service.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

const querySchema = z.object({
  q: z.string().trim().min(1, 'Query is required').max(120),
});

router.get(
  '/',
  validate({ query: querySchema }),
  asyncHandler(async (req, res) => {
    const results = await globalSearch(req.query.q as string);
    sendData(res, { results, query: req.query.q });
  }),
);

export default router;
