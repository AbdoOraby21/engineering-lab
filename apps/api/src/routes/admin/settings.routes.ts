import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/http.js';
import { getSettings, updateSettings, getSetting } from '../../services/admin/settings.service.js';
import { writeAuditLog } from '../../services/admin/audit.service.js';
import { settingsStoreSchema } from '@engineering-lab/shared';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

const groupParam = z.object({ group: z.enum(['store', 'payments', 'shipping', 'notifications', 'maintenance']) });

router.get(
  '/:group',
  validate({ params: groupParam }),
  asyncHandler(async (req, res) => {
    const group = String(req.params.group ?? '');
    const settings = await getSettings(group);
    sendData(res, { settings });
  }),
);

router.get(
  '/:group/:key',
  validate({ params: groupParam.extend({ key: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const group = String(req.params.group ?? '');
    const key = String(req.params.key ?? '');
    const value = await getSetting(`${group}.${key}`);
    sendData(res, { key: `${group}.${key}`, value });
  }),
);

router.put(
  '/:group',
  validate({ params: groupParam, body: settingsStoreSchema }),
  asyncHandler(async (req, res) => {
    const group = String(req.params.group ?? '');
    await updateSettings(
      group,
      req.body,
      req.authUser!.id,
      req.ip ?? undefined,
      req.get('user-agent') ?? undefined,
    );
    await writeAuditLog({
      actorId: req.authUser!.id,
      action: 'SETTING.UPDATE_GROUP',
      entity: 'Setting',
      entityId: group,
      after: req.body,
      ip: req.ip ?? undefined,
      userAgent: req.get('user-agent') ?? undefined,
    });
    sendData(res, { ok: true });
  }),
);

export default router;
