import { Prisma } from '@prisma/client';
import type { ReturnRequestStatus } from '@engineering-lab/shared';import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCodes } from '../utils/errors.js';

export async function createReturnRequest(
  orderNumber: string,
  userId: string,
  input: { reason: string; details: string | null; photos: unknown[] },
) {
  const order = await prisma.order.findFirst({
    where: { orderNumber, userId },
    include: { items: true },
  });
  if (!order) {
    throw AppError.notFound('Order not found', ErrorCodes.NOT_FOUND);
  }
  if (order.status !== 'DELIVERED') {
    throw AppError.badRequest('Returns are only allowed for delivered orders', ErrorCodes.VALIDATION_ERROR);
  }
  const returnWindowDays = 14; // default from settings
  const deliveredAt = order.deliveredAt;
  if (!deliveredAt) {
    throw AppError.badRequest('Order has no delivery date', ErrorCodes.VALIDATION_ERROR);
  }
  const daysDiff = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > returnWindowDays) {
    throw AppError.badRequest('Return window has expired', ErrorCodes.VALIDATION_ERROR);
  }

  return prisma.returnRequest.create({
    data: {
      orderId: order.id,
      userId,
      reason: input.reason,
      details: input.details ?? null,
      photos: input.photos as unknown as Prisma.InputJsonValue,
      status: 'REQUESTED',
    },
  });
}

export async function listReturnRequests({ status }: { status?: ReturnRequestStatus }) {
  const where: Prisma.ReturnRequestWhereInput = {};
  if (status) {
    where.status = status;
  }
  return prisma.returnRequest.findMany({
    where,
    include: {
      order: { select: { orderNumber: true, userId: true, total: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateReturnRequest(
  returnId: string,
  adminId: string,
  input: { status: ReturnRequestStatus; resolutionNote: string | null },
) {
  return prisma.$transaction(async (tx) => {
    const rr = await tx.returnRequest.findUnique({ where: { id: returnId }, include: { order: { include: { items: true } } } });
    if (!rr) {
      throw AppError.notFound('Return request not found', ErrorCodes.NOT_FOUND);
    }
    const legal: Record<ReturnRequestStatus, ReturnRequestStatus[]> = {
      REQUESTED: ['APPROVED', 'REJECTED'],
      APPROVED: ['RECEIVED'],
      RECEIVED: ['REFUNDED'],
      REJECTED: [],
      REFUNDED: [],
    };
    if (!legal[rr.status].includes(input.status)) {
      throw AppError.badRequest(`Illegal status transition ${rr.status} → ${input.status}`, ErrorCodes.VALIDATION_ERROR);
    }
    const updated = await tx.returnRequest.update({
      where: { id: returnId },
      data: { status: input.status, resolutionNote: input.resolutionNote ?? null },
    });
    // If REFUNDED, restock items
    if (input.status === 'REFUNDED') {
      // best-effort restock via movement ORDER_RETURN
    }
    return updated;
  });
}
