import { Router } from 'express';
import {
  stockMovementsQuerySchema,
  type StockMovementsQuery,
} from '@engineering-lab/shared';
import type { StockMovementReason } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/http.js';
import { getLowStock, listMovements } from '../../services/admin/admin-product.service.js';

const router = Router();

const lowStockQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/movements',
  validate({ query: stockMovementsQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as StockMovementsQuery;
    const result = await listMovements({
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.variantId ? { variantId: query.variantId } : {}),
      ...(query.reason ? { reason: query.reason as StockMovementReason } : {}),
      page: query.page,
      pageSize: query.pageSize,
    });
    sendData(res, result);
  }),
);

router.get(
  '/low-stock',
  validate({ query: lowStockQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as z.infer<typeof lowStockQuerySchema>;
    const result = await getLowStock(page, pageSize);
    sendData(res, result);
  }),
);

export default router;
