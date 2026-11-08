import { Router } from 'express';
import {
  autocompleteQuerySchema,
  type AutocompleteQuery,
} from '@engineering-lab/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { sendData } from '../utils/http.js';
import { suggest } from '../services/catalog/product.service.js';

const router = Router();

router.get(
  '/suggest',
  validate({ query: autocompleteQuerySchema }),
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query as unknown as AutocompleteQuery;
    const suggestions = await suggest(q, limit);
    sendData(res, { suggestions });
  }),
);

export default router;
