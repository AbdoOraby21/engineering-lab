import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/http.js';
import { prisma } from '../../lib/prisma.js';
import { listProofs, approveProof, rejectProof } from '../../services/payment-proof.service.js';
import { transitionOrderStatus } from '../../services/order.service.js';
import { listReturnRequests, updateReturnRequest } from '../../services/return.service.js';
import type { OrderStatus, PaymentProofStatus, ReturnRequestStatus } from '@engineering-lab/shared';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get(
  '/payment-proofs',
  asyncHandler(async (req, res) => {
    const status = (req.query.status as PaymentProofStatus | undefined);
    const proofs = await listProofs({ status });
    sendData(res, { proofs });
  }),
);

router.post(
  '/payment-proofs/:proofId/approve',
  validate({ params: z.object({ proofId: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const proof = await approveProof(req.params.proofId!, req.authUser!.id);
    sendData(res, { proof });
  }),
);

router.post(
  '/payment-proofs/:proofId/reject',
  validate({
    params: z.object({ proofId: z.string().min(1) }),
    body: z.object({ reason: z.string().min(1).max(200) }),
  }),
  asyncHandler(async (req, res) => {
    const proof = await rejectProof(req.params.proofId!, req.authUser!.id, req.body.reason);
    sendData(res, { proof });
  }),
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)));
    const status = (req.query.status as OrderStatus | undefined);
    const offset = (page - 1) * pageSize;
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: pageSize,
        include: { user: { select: { id: true, name: true, email: true } }, items: true },
      }),
    ]);
    sendData(res, {
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        user: o.user,
        status: o.status,
        paymentMethod: o.paymentMethod,
        total: o.total,
        createdAt: o.createdAt.toISOString(),
        paymentDeadlineAt: o.paymentDeadlineAt?.toISOString() ?? null,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  }),
);

router.patch(
  '/orders/:id/status',
  validate({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({
      status: z.enum(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
      note: z.string().max(200).optional().nullable(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const order = await transitionOrderStatus(req.params.id!, req.body.status, req.authUser!.id, req.body.note ?? undefined);
    sendData(res, { order });
  }),
);

router.post(
  '/orders/:id/cancel',
  validate({ params: z.object({ id: z.string().min(1) }), body: z.object({ reason: z.string().max(200).optional().nullable() }).optional() }),
  asyncHandler(async (req, res) => {
    sendData(res, { ok: true });
  }),
);

router.get(
  '/return-requests',
  asyncHandler(async (req, res) => {
    const status = (req.query.status as ReturnRequestStatus | undefined);
    const requests = await listReturnRequests({ status });
    sendData(res, { requests });
  }),
);

router.post(
  '/return-requests/:id',
  validate({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({ status: z.enum(['APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED']), resolutionNote: z.string().max(200).optional().nullable() }),
  }),
  asyncHandler(async (req, res) => {
    const updated = await updateReturnRequest(req.params.id!, req.authUser!.id, {
      status: req.body.status,
      resolutionNote: req.body.resolutionNote ?? null,
    });
    sendData(res, { returnRequest: updated });
  }),
);

export default router;
