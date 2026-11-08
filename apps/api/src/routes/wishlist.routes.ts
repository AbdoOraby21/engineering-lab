import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendData } from '../utils/http.js';
import {
  addWishlistItem,
  listWishlist,
  removeWishlistItem,
} from '../services/wishlist.service.js';

const router = Router();

const productParamsSchema = z.object({ productId: z.string().min(1).max(64) });
const addBodySchema = z.object({ productId: z.string().min(1).max(64) });

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await listWishlist(req.authUser!.id);
    sendData(res, { items });
  }),
);

router.post(
  '/',
  validate({ body: addBodySchema }),
  asyncHandler(async (req, res) => {
    const item = await addWishlistItem(req.authUser!.id, req.body.productId as string);
    sendData(res, { item }, 201);
  }),
);

// Spec alias: POST /wishlist/:productId
router.post(
  '/:productId',
  validate({ params: productParamsSchema }),
  asyncHandler(async (req, res) => {
    const item = await addWishlistItem(req.authUser!.id, req.params.productId as string);
    sendData(res, { item }, 201);
  }),
);

router.delete(
  '/:productId',
  validate({ params: productParamsSchema }),
  asyncHandler(async (req, res) => {
    await removeWishlistItem(req.authUser!.id, req.params.productId as string);
    sendData(res, { success: true });
  }),
);

export default router;
