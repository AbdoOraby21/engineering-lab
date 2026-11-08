import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendData } from '../utils/http.js';
import { placeOrder, listMyOrders, getOrder, cancelOrder } from '../services/order.service.js';
import { submitProof } from '../services/payment-proof.service.js';
import { uploadLimiter, checkoutLimiter } from '../middleware/rateLimit.js';
import multer from 'multer';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { getStorageDriver } from '../services/storage/index.js';
import { resolvePublicId } from '../services/storage/local.js';
import { sniffFileKind } from '../utils/file-signatures.js';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { prisma } from '../lib/prisma.js';
import { idempotencyStore } from '../lib/idempotency.js';
import type { OrderStatus } from '@engineering-lab/shared';

const router = Router();

router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const placeBody = z.object({
  addressId: z.string().min(1).max(64),
  couponCode: z.string().trim().min(1).max(40).optional().nullable(),
  paymentMethod: z.enum(['VODAFONE_CASH', 'INSTAPAY', 'COD']),
  customerNote: z.string().max(500).optional().nullable(),
  idempotencyKey: z.string().min(1).max(128),
});

const proofBody = z.object({
  senderPhone: z.string().trim().min(1),
  referenceNumber: z.string().trim().min(1).max(64).optional().nullable(),
  transferredAt: z.string().datetime(),
  amount: z.coerce.number().int().positive(),
});

router.post(
  '/',
  checkoutLimiter,
  validate({ body: placeBody }),
  asyncHandler(async (req, res) => {
    const idem = req.get('Idempotency-Key') ?? req.body.idempotencyKey;
    if (!idem || idem.length > 128) {
      throw AppError.badRequest('Idempotency-Key header is required', ErrorCodes.VALIDATION_ERROR);
    }
    if (idempotencyStore.isProcessing(idem)) {
      throw AppError.conflict('Order with this idempotency key is already being processed', ErrorCodes.CONFLICT);
    }
    const existing = idempotencyStore.get(idem);
    if (existing) {
      return res.status(existing.statusCode).json(existing.body);
    }
    idempotencyStore.markProcessing(idem);
    try {
      const order = await placeOrder(req.authUser!.id, {
        addressId: req.body.addressId,
        couponCode: req.body.couponCode ?? null,
        paymentMethod: req.body.paymentMethod,
        customerNote: req.body.customerNote ?? null,
        idempotencyKey: idem,
      });
      const responseBody = { order: order.order, total: order.total };
      idempotencyStore.set(idem, { statusCode: 201, body: responseBody, createdAt: Date.now() });
      sendData(res, responseBody, 201);
    } finally {
      idempotencyStore.clearProcessing(idem);
    }
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)));
    const status = (req.query.status as OrderStatus | undefined);
    const result = await listMyOrders(req.authUser!.id, { page, pageSize, status });
    sendData(res, result);
  }),
);

router.get(
  '/:orderNumber',
  asyncHandler(async (req, res) => {
    const order = await getOrder(req.params.orderNumber!, req.authUser!.id);
    sendData(res, { order });
  }),
);

router.post(
  '/:orderNumber/cancel',
  validate({
    params: z.object({ orderNumber: z.string().min(1) }),
    body: z.object({ reason: z.string().max(200).optional().nullable() }).optional(),
  }),
  asyncHandler(async (req, res) => {
    const order = await cancelOrder(req.params.orderNumber!, req.authUser!.id, req.body?.reason ?? undefined);
    sendData(res, { order });
  }),
);

router.post(
  '/:orderNumber/payment-proof',
  uploadLimiter,
  upload.single('screenshot'),
  validate({ body: proofBody }),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw AppError.badRequest('Screenshot is required', ErrorCodes.VALIDATION_ERROR);
    }
    const kind = sniffFileKind(req.file.buffer);
    if (kind !== 'jpeg' && kind !== 'png' && kind !== 'webp') {
      throw AppError.badRequest(
        'Screenshot must be a valid JPEG, PNG or WebP image',
        ErrorCodes.UNSUPPORTED_FILE_TYPE,
      );
    }
    const driver = getStorageDriver();
    const stored = await driver.uploadDatasheet({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder: `proofs/${req.authUser!.id}`,
    });

    const proof = await submitProof(req.params.orderNumber!, req.authUser!.id, {
      senderPhone: req.body.senderPhone,
      referenceNumber: req.body.referenceNumber,
      transferredAt: new Date(req.body.transferredAt),
      amount: req.body.amount,
      screenshotUrl: stored.url,
    });
    sendData(res, { proof }, 201);
  }),
);

// Private, authorized proof screenshot download (owner or admin only).
router.get(
  '/:orderNumber/payment-proofs/:proofId/screenshot',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { orderNumber: req.params.orderNumber! },
    });
    if (!order) {
      throw AppError.notFound('Order not found', ErrorCodes.NOT_FOUND);
    }
    if (order.userId !== req.authUser!.id && req.authUser!.role !== 'ADMIN') {
      throw AppError.forbidden();
    }
    const proof = await prisma.paymentProof.findFirst({
      where: { id: req.params.proofId!, orderId: order.id },
    });
    if (!proof) {
      throw AppError.notFound('Proof not found', ErrorCodes.NOT_FOUND);
    }
    const publicId = proof.screenshotUrl.replace(/^\/uploads\//, '');
    const absolutePath = resolvePublicId(publicId);
    res.setHeader('Content-Type', 'image/*');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="proof-${proof.id}${path.extname(publicId)}"`,
    );
    createReadStream(absolutePath).pipe(res);
  }),
);

router.get(
  '/:orderNumber/invoice',
  asyncHandler(async (req, res) => {
    const isAdmin = req.authUser!.role === 'ADMIN';
    const order = await getOrder(req.params.orderNumber!, req.authUser!.id, isAdmin ? req.authUser!.id : undefined);
    const { generateInvoicePdf } = await import('../services/invoice.service.js');
    const pdf = await generateInvoicePdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.pdf"`);
    res.send(pdf);
  }),
);

export default router;
