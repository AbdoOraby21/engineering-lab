import { Router } from 'express';
import { z } from 'zod';
import {
  adminCategoryReorderSchema,
  adminCategorySchema,
  adminCategoryUpdateSchema,
  type AdminCategoryReorderInput,
  type AdminCategoryInput,
  type AdminCategoryUpdate,
} from '@engineering-lab/shared';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/http.js';
import {
  createCategory,
  deleteCategory,
  listAdminCategories,
  reorderCategories,
  setCategoryActive,
  updateCategory,
} from '../../services/admin/admin-catalog.service.js';

const router = Router();

const toggleSchema = z.object({ value: z.boolean().optional() });

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await listAdminCategories();
    sendData(res, { categories });
  }),
);

router.post(
  '/',
  validate({ body: adminCategorySchema }),
  asyncHandler(async (req, res) => {
    const category = await createCategory(req.body as AdminCategoryInput);
    sendData(res, { category }, 201);
  }),
);

router.patch(
  '/reorder',
  validate({ body: adminCategoryReorderSchema }),
  asyncHandler(async (req, res) => {
    const categories = await reorderCategories(req.body as AdminCategoryReorderInput);
    sendData(res, { categories });
  }),
);

router.patch(
  '/:id/toggle-active',
  validate({ body: toggleSchema }),
  asyncHandler(async (req, res) => {
    const { value } = req.body as { value?: boolean };
    const category = await setCategoryActive(String(req.params.id), value);
    sendData(res, { category });
  }),
);

router.patch(
  '/:id',
  validate({ body: adminCategoryUpdateSchema }),
  asyncHandler(async (req, res) => {
    const category = await updateCategory(String(req.params.id), req.body as AdminCategoryUpdate);
    sendData(res, { category });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteCategory(String(req.params.id));
    sendData(res, { deleted: true });
  }),
);

export default router;
