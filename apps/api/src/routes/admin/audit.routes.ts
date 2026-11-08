import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/http.js';
import { listAuditLogs } from '../../services/admin/audit.service.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

const querySchema = z.object({
  actorId: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  entity: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

router.get(
  '/',
  validate({ query: querySchema }),
  asyncHandler(async (req, res) => {
    const result = await listAuditLogs(req.query as unknown as Parameters<typeof listAuditLogs>[0]);
    sendData(res, result);
  }),
);

export default router;
