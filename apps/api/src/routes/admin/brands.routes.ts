import { Router } from 'express';
import { z } from 'zod';
import {
  adminBrandSchema,
  adminBrandUpdateSchema,
  type AdminBrandInput,
  type AdminBrandUpdate,
} from '@engineering-lab/shared';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/http.js';
import {
  createBrand,
  deleteBrand,
  listAdminBrands,
  setBrandActive,
  updateBrand,
} from '../../services/admin/admin-catalog.service.js';

const router = Router();

const toggleSchema = z.object({ value: z.boolean().optional() });

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const brands = await listAdminBrands();
    sendData(res, { brands });
  }),
);

router.post(
  '/',
  validate({ body: adminBrandSchema }),
  asyncHandler(async (req, res) => {
    const brand = await createBrand(req.body as AdminBrandInput);
    sendData(res, { brand }, 201);
  }),
);

router.patch(
  '/:id/toggle-active',
  validate({ body: toggleSchema }),
  asyncHandler(async (req, res) => {
    const { value } = req.body as { value?: boolean };
    const brand = await setBrandActive(String(req.params.id), value);
    sendData(res, { brand });
  }),
);

router.patch(
  '/:id',
  validate({ body: adminBrandUpdateSchema }),
  asyncHandler(async (req, res) => {
    const brand = await updateBrand(String(req.params.id), req.body as AdminBrandUpdate);
    sendData(res, { brand });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteBrand(String(req.params.id));
    sendData(res, { deleted: true });
  }),
);

export default router;
