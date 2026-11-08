import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendData } from '../utils/http.js';
import {
  addCartItem,
  clearCart,
  listCart,
  mergeCart,
  removeCartItem,
  updateCartItem,
} from '../services/cart.service.js';
import { addCartItemSchema, updateCartItemSchema } from '@engineering-lab/shared';

const router = Router();

router.use(requireAuth);

const mergeBodySchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1).max(64),
      variantId: z.string().min(1).max(64).optional().nullable(),
      qty: z.coerce.number().int().min(1).max(99).default(1),
    }),
  ),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const cart = await listCart(req.authUser!.id);
    sendData(res, { cart });
  }),
);

router.post(
  '/items',
  validate({ body: addCartItemSchema }),
  asyncHandler(async (req, res) => {
    const cart = await addCartItem(
      req.authUser!.id,
      req.body.productId,
      req.body.variantId ?? null,
      req.body.qty,
    );
    sendData(res, { cart }, 201);
  }),
);

router.patch(
  '/items/:itemId',
  validate({ params: z.object({ itemId: z.string().min(1) }), body: updateCartItemSchema }),
  asyncHandler(async (req, res) => {
    const cart = await updateCartItem(req.authUser!.id, req.params.itemId as string, req.body.qty);
    sendData(res, { cart });
  }),
);

router.delete(
  '/items/:itemId',
  validate({ params: z.object({ itemId: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const cart = await removeCartItem(req.authUser!.id, req.params.itemId as string);
    sendData(res, { cart });
  }),
);

router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const cart = await clearCart(req.authUser!.id);
    sendData(res, { cart });
  }),
);

router.post(
  '/merge',
  validate({ body: mergeBodySchema }),
  asyncHandler(async (req, res) => {
    const cart = await mergeCart(req.authUser!.id, req.body.items);
    sendData(res, { cart });
  }),
);

export default router;
