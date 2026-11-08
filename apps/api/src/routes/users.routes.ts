import { Router } from 'express';
import { z } from 'zod';
import {
  addressSchema,
  addressUpdateSchema,
  changePasswordSchema,
  updateProfileSchema,
  type AddressInput,
  type AddressUpdateInput,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from '@engineering-lab/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { sendData } from '../utils/http.js';
import { setRefreshCookie } from '../utils/cookies.js';
import type { SessionMeta } from '../services/auth.service.js';
import { changePassword } from '../services/auth.service.js';
import { getUserById, updateProfile } from '../services/user.service.js';
import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from '../services/address.service.js';

const router = Router();

const addressParamsSchema = z.object({ id: z.string().min(1).max(64) });

router.use(requireAuth);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.authUser!.id);
    sendData(res, { user });
  }),
);

router.patch(
  '/me',
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    const user = await updateProfile(req.authUser!.id, req.body as UpdateProfileInput);
    sendData(res, { user });
  }),
);

router.post(
  '/me/change-password',
  authLimiter,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    const meta: SessionMeta = {
      userAgent: req.get('user-agent') ?? undefined,
      ip: req.ip,
    };
    const session = await changePassword(req.authUser!.id, req.body as ChangePasswordInput, meta);
    setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
    sendData(res, {
      user: session.user,
      accessToken: session.accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
    });
  }),
);

router.get(
  '/me/addresses',
  asyncHandler(async (req, res) => {
    const addresses = await listAddresses(req.authUser!.id);
    sendData(res, { addresses });
  }),
);

router.post(
  '/me/addresses',
  validate({ body: addressSchema }),
  asyncHandler(async (req, res) => {
    const address = await createAddress(req.authUser!.id, req.body as AddressInput);
    sendData(res, { address }, 201);
  }),
);

router.patch(
  '/me/addresses/:id',
  validate({ params: addressParamsSchema, body: addressUpdateSchema }),
  asyncHandler(async (req, res) => {
    const address = await updateAddress(
      req.authUser!.id,
      req.params.id as string,
      req.body as AddressUpdateInput,
    );
    sendData(res, { address });
  }),
);

router.delete(
  '/me/addresses/:id',
  validate({ params: addressParamsSchema }),
  asyncHandler(async (req, res) => {
    await deleteAddress(req.authUser!.id, req.params.id as string);
    sendData(res, { success: true });
  }),
);

router.post(
  '/me/addresses/:id/default',
  validate({ params: addressParamsSchema }),
  asyncHandler(async (req, res) => {
    const address = await setDefaultAddress(req.authUser!.id, req.params.id as string);
    sendData(res, { address });
  }),
);

export default router;
