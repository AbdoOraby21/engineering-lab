import type { CouponDto, CouponValidationResult } from '@engineering-lab/shared';
import { prisma } from '../lib/prisma.js';

export async function validateCoupon(
  code: string,
  userId: string,
  subtotalEgp: number,
): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findFirst({
    where: {
      code: code.toUpperCase(),
      isActive: true,
    },
  });
  if (!coupon) {
    return { valid: false, code, discountTotal: 0, reason: 'Coupon not found' };
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { valid: false, code, discountTotal: 0, reason: 'Coupon not yet active' };
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { valid: false, code, discountTotal: 0, reason: 'Coupon expired' };
  }
  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
    const used = await prisma.couponRedemption.count({ where: { couponId: coupon.id } });
    if (used >= coupon.usageLimit) {
      return { valid: false, code, discountTotal: 0, reason: 'Coupon usage limit reached' };
    }
  }
  if (coupon.perUserLimit !== null && coupon.perUserLimit !== undefined) {
    const usedByUser = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId },
    });
    if (usedByUser >= coupon.perUserLimit) {
      return { valid: false, code, discountTotal: 0, reason: 'You have already used this coupon' };
    }
  }
  if (coupon.minSubtotal !== null && coupon.minSubtotal !== undefined && subtotalEgp < coupon.minSubtotal) {
    return {
      valid: false,
      code,
      discountTotal: 0,
      reason: `Minimum subtotal ${coupon.minSubtotal} EGP required`,
    };
  }

  let discount = 0;
  if (coupon.type === 'PERCENT') {
    discount = Math.round((subtotalEgp * coupon.value) / 100);
  } else {
    discount = coupon.value;
  }
  if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined && discount > coupon.maxDiscount) {
    discount = coupon.maxDiscount;
  }

  return {
    valid: true,
    code: coupon.code,
    discountTotal: discount,
  };
}

export async function toCouponDto(coupon: {
  id: string;
  code: string;
  type: string;
  value: number;
  minSubtotal: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
}): Promise<CouponDto> {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type as 'PERCENT' | 'FIXED',
    value: coupon.value,
    minSubtotal: coupon.minSubtotal,
    maxDiscount: coupon.maxDiscount,
    usageLimit: coupon.usageLimit,
    perUserLimit: coupon.perUserLimit,
    startsAt: coupon.startsAt?.toISOString() ?? null,
    expiresAt: coupon.expiresAt?.toISOString() ?? null,
    isActive: coupon.isActive,
  };
}
