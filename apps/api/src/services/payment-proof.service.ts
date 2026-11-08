import { Prisma } from '@prisma/client';
import type { PaymentProofStatus } from '@engineering-lab/shared';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { notifyAdminNewProof, notifyPaymentApproved, notifyPaymentRejected } from './notification.service.js';

export async function submitProof(
  orderNumber: string,
  userId: string,
  input: { senderPhone: string; referenceNumber: string | null; transferredAt: Date; amount: number; screenshotUrl: string },
) {
  const order = await prisma.order.findFirst({ where: { orderNumber, userId } });
  if (!order) {
    throw AppError.notFound('Order not found', ErrorCodes.NOT_FOUND);
  }
  if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PENDING_PAYMENT_REVIEW') {
    throw AppError.badRequest('Payment proof can only be submitted for unpaid orders', ErrorCodes.VALIDATION_ERROR);
  }

  const proof = await prisma.paymentProof.create({
    data: {
      orderId: order.id,
      senderPhone: input.senderPhone,
      referenceNumber: input.referenceNumber ?? null,
      transferredAt: input.transferredAt,
      amount: input.amount,
      screenshotUrl: input.screenshotUrl,
      status: 'SUBMITTED',
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'PENDING_PAYMENT_REVIEW' },
  });
  await prisma.orderStatusHistory.create({
    data: { orderId: order.id, from: order.status, to: 'PENDING_PAYMENT_REVIEW', actorId: userId, note: 'Payment proof submitted' },
  });

  // Notify admin (best-effort)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user?.email) {
    void notifyAdminNewProof(user.email, orderNumber);
  }

  return proof;
}

export async function listProofs({ status }: { status?: PaymentProofStatus }) {
  const where: Prisma.PaymentProofWhereInput = {};
  if (status) {
    where.status = status;
  }
  return prisma.paymentProof.findMany({
    where,
    include: {
      order: { select: { orderNumber: true, userId: true, total: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function approveProof(proofId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const proof = await tx.paymentProof.findUnique({ where: { id: proofId }, include: { order: true } });
    if (!proof) {
      throw AppError.notFound('Payment proof not found', ErrorCodes.NOT_FOUND);
    }
    if (proof.status !== 'SUBMITTED') {
      throw AppError.badRequest('Proof already reviewed', ErrorCodes.VALIDATION_ERROR);
    }
    const order = proof.order;
    if (order.status !== 'PENDING_PAYMENT_REVIEW') {
      throw AppError.badRequest('Order is not in payment review', ErrorCodes.VALIDATION_ERROR);
    }

    const updated = await tx.paymentProof.update({
      where: { id: proofId },
      data: { status: 'APPROVED', reviewedById: adminId, reviewedAt: new Date() },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, from: order.status, to: 'CONFIRMED', actorId: adminId, note: 'Payment proof approved' },
    });

    const user = await tx.user.findUnique({ where: { id: order.userId }, select: { email: true, locale: true } });
    if (user?.email) {
      void notifyPaymentApproved(order.userId, user.email, (user.locale ?? 'en') as 'ar' | 'en', order.orderNumber);
    }
    return updated;
  });
}

export async function rejectProof(proofId: string, adminId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const proof = await tx.paymentProof.findUnique({ where: { id: proofId }, include: { order: true } });
    if (!proof) {
      throw AppError.notFound('Payment proof not found', ErrorCodes.NOT_FOUND);
    }
    if (proof.status !== 'SUBMITTED') {
      throw AppError.badRequest('Proof already reviewed', ErrorCodes.VALIDATION_ERROR);
    }
    const order = proof.order;

    const updated = await tx.paymentProof.update({
      where: { id: proofId },
      data: { status: 'REJECTED', reviewedById: adminId, reviewedAt: new Date(), rejectReason: reason },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'PENDING_PAYMENT' },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, from: order.status, to: 'PENDING_PAYMENT', actorId: adminId, note: `Payment proof rejected: ${reason}` },
    });

    const user = await tx.user.findUnique({ where: { id: order.userId }, select: { email: true, locale: true } });
    if (user?.email) {
      void notifyPaymentRejected(order.userId, user.email, (user.locale ?? 'en') as 'ar' | 'en', order.orderNumber, reason);
    }
    return updated;
  });
}
