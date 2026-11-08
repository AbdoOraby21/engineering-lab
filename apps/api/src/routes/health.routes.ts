import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { prisma } from '../lib/prisma.js';
import { sendData } from '../utils/http.js';

const router = Router();

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    sendData(res, {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }),
);

router.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    sendData(res, { status: 'ready', timestamp: new Date().toISOString() });
  }),
);

export default router;
