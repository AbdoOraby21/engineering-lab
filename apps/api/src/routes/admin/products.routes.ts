import { Router } from 'express';
import { z } from 'zod';
import type { StockMovementReason } from '@prisma/client';
import {
  adminBundleItemsSchema,
  adminCreateProductSchema,
  adminProductListQuerySchema,
  adminReorderImagesSchema,
  adminSpecsSchema,
  adminUpdateProductSchema,
  adminVariantSchema,
  adminVariantUpdateSchema,
  exportQuerySchema,
  importQuerySchema,
  stockAdjustmentSchema,
  type AdminBundleItemsInput,
  type AdminCreateProductInput,
  type AdminProductListQuery,
  type AdminReorderImagesInput,
  type AdminSpecsInput,
  type AdminUpdateProductInput,
  type AdminVariantInput,
  type AdminVariantUpdate,
  type ExportQuery,
  type ImportQuery,
  type StockAdjustmentInput,
} from '@engineering-lab/shared';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/http.js';
import { uploadImportFile, uploadSingleImage } from '../../middleware/upload.js';
import {
  addProductImage,
  addVariant,
  adminAdjustStock,
  createAdminProduct,
  deleteAdminProduct,
  deleteProductImage,
  deleteVariant,
  duplicateAdminProduct,
  getAdminProduct,
  listAdminProducts,
  replaceBundleItems,
  replaceSpecs,
  reorderProductImages,
  setPrimaryImage,
  setProductFlag,
  updateAdminProduct,
  updateVariant,
} from '../../services/admin/admin-product.service.js';
import {
  exportProducts,
  importProducts,
  IMPORT_TEMPLATE,
} from '../../services/admin/import-export.service.js';
import { AppError, ErrorCodes } from '../../utils/errors.js';

const router = Router();

const flagSchema = z.object({ value: z.boolean().optional() });
const altSchema = z.object({
  altAr: z.string().trim().max(300).nullish(),
  altEn: z.string().trim().max(300).nullish(),
});

// Import/export must be registered before /:id so they are not captured by it.
router.get(
  '/import/template',
  asyncHandler(async (_req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="engineering-lab-products-template.csv"');
    res.send(`\uFEFF${IMPORT_TEMPLATE}`);
  }),
);

router.post(
  '/import',
  uploadImportFile,
  validate({ query: importQuerySchema }),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw AppError.badRequest('An import file is required (field "file")', ErrorCodes.VALIDATION_ERROR);
    }
    const { dryRun } = req.query as unknown as ImportQuery;
    const result = await importProducts(req.file.buffer, req.file.originalname, {
      dryRun,
      createdById: req.authUser?.id ?? null,
    });
    sendData(res, { report: result });
  }),
);

router.get(
  '/export',
  validate({ query: exportQuerySchema }),
  asyncHandler(async (req, res) => {
    const { format } = req.query as unknown as ExportQuery;
    const { buffer, contentType, filename } = await exportProducts(format);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }),
);

router.get(
  '/',
  validate({ query: adminProductListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await listAdminProducts(req.query as unknown as AdminProductListQuery);
    sendData(res, result);
  }),
);

router.post(
  '/',
  validate({ body: adminCreateProductSchema }),
  asyncHandler(async (req, res) => {
    const product = await createAdminProduct(
      req.body as AdminCreateProductInput,
      req.authUser?.id ?? null,
    );
    sendData(res, { product }, 201);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await getAdminProduct(String(req.params.id));
    sendData(res, { product });
  }),
);

router.patch(
  '/:id',
  validate({ body: adminUpdateProductSchema }),
  asyncHandler(async (req, res) => {
    const product = await updateAdminProduct(String(req.params.id), req.body as AdminUpdateProductInput);
    sendData(res, { product });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await deleteAdminProduct(String(req.params.id));
    sendData(res, result);
  }),
);

router.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const product = await duplicateAdminProduct(String(req.params.id));
    sendData(res, { product }, 201);
  }),
);

router.post(
  '/:id/toggle-featured',
  validate({ body: flagSchema }),
  asyncHandler(async (req, res) => {
    const { value } = req.body as { value?: boolean };
    const result = await setProductFlag(String(req.params.id), 'isFeatured', value);
    sendData(res, result);
  }),
);

router.post(
  '/:id/toggle-new',
  validate({ body: flagSchema }),
  asyncHandler(async (req, res) => {
    const { value } = req.body as { value?: boolean };
    const result = await setProductFlag(String(req.params.id), 'isNew', value);
    sendData(res, result);
  }),
);

router.post(
  '/:id/toggle-active',
  validate({ body: flagSchema }),
  asyncHandler(async (req, res) => {
    const { value } = req.body as { value?: boolean };
    const result = await setProductFlag(String(req.params.id), 'isActive', value);
    sendData(res, result);
  }),
);

// Images
router.post(
  '/:id/images',
  uploadSingleImage,
  validate({ body: altSchema }),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw AppError.badRequest('An image file is required (field "image")', ErrorCodes.VALIDATION_ERROR);
    }
    const { altAr, altEn } = req.body as { altAr?: string | null; altEn?: string | null };
    const image = await addProductImage(
      String(req.params.id),
      { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
      { altAr, altEn },
    );
    sendData(res, { image }, 201);
  }),
);

router.patch(
  '/:id/images/reorder',
  validate({ body: adminReorderImagesSchema }),
  asyncHandler(async (req, res) => {
    const { imageIds } = req.body as AdminReorderImagesInput;
    const images = await reorderProductImages(String(req.params.id), imageIds);
    sendData(res, { images });
  }),
);

router.post(
  '/:id/images/:imageId/primary',
  asyncHandler(async (req, res) => {
    const result = await setPrimaryImage(String(req.params.id), String(req.params.imageId));
    sendData(res, result);
  }),
);

router.delete(
  '/:id/images/:imageId',
  asyncHandler(async (req, res) => {
    const result = await deleteProductImage(String(req.params.id), String(req.params.imageId));
    sendData(res, result);
  }),
);

// Variants
router.post(
  '/:id/variants',
  validate({ body: adminVariantSchema }),
  asyncHandler(async (req, res) => {
    const variant = await addVariant(String(req.params.id), req.body as AdminVariantInput);
    sendData(res, { variant }, 201);
  }),
);

router.patch(
  '/variants/:variantId',
  validate({ body: adminVariantUpdateSchema }),
  asyncHandler(async (req, res) => {
    const variant = await updateVariant(String(req.params.variantId), req.body as AdminVariantUpdate);
    sendData(res, { variant });
  }),
);

router.delete(
  '/variants/:variantId',
  asyncHandler(async (req, res) => {
    const result = await deleteVariant(String(req.params.variantId));
    sendData(res, result);
  }),
);

// Bundle items + specs
router.put(
  '/:id/bundle-items',
  validate({ body: adminBundleItemsSchema }),
  asyncHandler(async (req, res) => {
    const product = await replaceBundleItems(String(req.params.id), req.body as AdminBundleItemsInput);
    sendData(res, { product });
  }),
);

router.put(
  '/:id/specs',
  validate({ body: adminSpecsSchema }),
  asyncHandler(async (req, res) => {
    const result = await replaceSpecs(String(req.params.id), req.body as AdminSpecsInput);
    sendData(res, result);
  }),
);

// Stock
router.post(
  '/:id/stock-adjustments',
  validate({ body: stockAdjustmentSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as StockAdjustmentInput;
    const result = await adminAdjustStock(
      String(req.params.id),
      {
        delta: input.delta,
        reason: input.reason as StockMovementReason,
        note: input.note,
        variantId: input.variantId ?? null,
      },
      req.authUser?.id ?? null,
    );
    sendData(res, result);
  }),
);

export default router;
