import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendData } from '../utils/http.js';
import { validateCoupon } from '../services/coupon.service.js';
import { getShippingFee } from '../services/shipping.service.js';
import { listCart } from '../services/cart.service.js';
import { prisma } from '../lib/prisma.js';
import { couponLimiter } from '../middleware/rateLimit.js';

const router = Router();

const summaryQuery = z.object({
  addressId: z.string().min(1).max(64).optional(),
  coupon: z.string().trim().min(1).max(40).optional().nullable(),
});

router.get(
  '/summary',
  optionalAuth,
  validate({ query: summaryQuery }),
  asyncHandler(async (req, res) => {
    let subtotal = 0;
    const items: Array<{ productId: string; qty: number; unitPrice: number; lineTotal: number }> = [];
    if (req.authUser) {
      const cart = await listCart(req.authUser.id);
      subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
      items.push(...cart.items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        unitPrice: item.product.price,
        lineTotal: item.product.price * item.qty,
      })));
    }

    let shippingFee = 0;
    let shippingZone: { governorate: string; feeEgp: number; estimatedDaysMin: number; estimatedDaysMax: number } | null = null;
    if (req.query.addressId) {
      const address = await prisma.address.findFirst({
        where: {
          id: req.query.addressId as string,
          ...(req.authUser ? { userId: req.authUser.id } : {}),
        },
      });
      if (address) {
        const shipping = await getShippingFee(address.governorate);
        shippingFee = shipping.feeEgp;
        shippingZone = {
          governorate: shipping.zone?.governorate ?? address.governorate,
          feeEgp: shipping.feeEgp,
          estimatedDaysMin: shipping.estimatedDaysMin,
          estimatedDaysMax: shipping.estimatedDaysMax,
        };
      }
    }

    let discountTotal = 0;
    let coupon: { code: string; discountTotal: number } | null = null;
    if (req.query.coupon && req.authUser) {
      const validation = await validateCoupon(req.query.coupon as string, req.authUser.id, subtotal);
      if (validation.valid) {
        discountTotal = validation.discountTotal;
        coupon = { code: validation.code, discountTotal: validation.discountTotal };
      }
    }

    const total = Math.max(0, subtotal - discountTotal + shippingFee);
    sendData(res, {
      summary: { subtotal, discountTotal, shippingFee, total, shippingZone, coupon, items },
    });
  }),
);

const validateBody = z.object({ code: z.string().trim().min(1).max(40) });

router.post(
  '/coupons/validate',
  optionalAuth,
  couponLimiter,
  validate({ body: validateBody }),
  asyncHandler(async (req, res) => {
    if (!req.authUser) {
      sendData(res, { valid: false, code: req.body.code, discountTotal: 0, reason: 'Login required' });
      return;
    }
    const cart = await listCart(req.authUser.id);
    const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
    const validation = await validateCoupon(req.body.code, req.authUser.id, subtotal);
    sendData(res, validation);
  }),
);

export default router;
