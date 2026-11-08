import { Router } from 'express';
import {
  adminBannerSchema,
  adminBannerUpdateSchema,
  adminReorderBannersSchema,
  type AdminBannerInput,
  type AdminBannerUpdate,
  type AdminReorderBannersInput,
} from '@engineering-lab/shared';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/http.js';
import {
  createBanner,
  deleteBanner,
  listAdminBanners,
  reorderBanners,
  updateBanner,
} from '../../services/admin/admin-catalog.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const banners = await listAdminBanners();
    sendData(res, { banners });
  }),
);

router.post(
  '/',
  validate({ body: adminBannerSchema }),
  asyncHandler(async (req, res) => {
    const banner = await createBanner(req.body as AdminBannerInput);
    sendData(res, { banner }, 201);
  }),
);

router.patch(
  '/reorder',
  validate({ body: adminReorderBannersSchema }),
  asyncHandler(async (req, res) => {
    const { orderedIds } = req.body as AdminReorderBannersInput;
    const banners = await reorderBanners(orderedIds);
    sendData(res, { banners });
  }),
);

router.patch(
  '/:id',
  validate({ body: adminBannerUpdateSchema }),
  asyncHandler(async (req, res) => {
    const banner = await updateBanner(String(req.params.id), req.body as AdminBannerUpdate);
    sendData(res, { banner });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteBanner(String(req.params.id));
    sendData(res, { deleted: true });
  }),
);

export default router;
