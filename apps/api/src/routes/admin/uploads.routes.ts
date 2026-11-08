import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/http.js';
import { uploadLimiter } from '../../middleware/rateLimit.js';
import { uploadSingleDatasheet, uploadSingleImage } from '../../middleware/upload.js';
import { getStorageDriver } from '../../services/storage/index.js';
import { sniffFileKind } from '../../utils/file-signatures.js';
import { AppError, ErrorCodes } from '../../utils/errors.js';

const router = Router();

const folderSchema = z.object({
  folder: z
    .string()
    .trim()
    .max(64)
    .regex(/^[a-zA-Z0-9/_-]+$/, 'Invalid folder')
    .optional(),
});

router.post(
  '/image',
  uploadLimiter,
  uploadSingleImage,
  validate({ body: folderSchema }),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw AppError.badRequest('An image file is required (field "image")', ErrorCodes.VALIDATION_ERROR);
    }

    const kind = sniffFileKind(req.file.buffer);
    if (kind !== 'jpeg' && kind !== 'png' && kind !== 'webp') {
      throw AppError.badRequest(
        'File content is not a valid JPEG, PNG or WebP image',
        ErrorCodes.UNSUPPORTED_FILE_TYPE,
      );
    }

    const { folder } = req.body as { folder?: string };
    const stored = await getStorageDriver().uploadImage({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder: folder ?? 'products',
    });

    sendData(res, { image: stored }, 201);
  }),
);

router.post(
  '/datasheet',
  uploadLimiter,
  uploadSingleDatasheet,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw AppError.badRequest('A PDF file is required (field "datasheet")', ErrorCodes.VALIDATION_ERROR);
    }

    if (sniffFileKind(req.file.buffer) !== 'pdf') {
      throw AppError.badRequest('File content is not a valid PDF', ErrorCodes.UNSUPPORTED_FILE_TYPE);
    }

    const stored = await getStorageDriver().uploadDatasheet({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder: 'datasheets',
    });

    sendData(res, { file: stored }, 201);
  }),
);

router.delete(
  '/*',
  asyncHandler(async (req, res) => {
    const publicId = (req.params as Record<string, string>)[0];
    if (
      !publicId ||
      publicId.includes('..') ||
      publicId.startsWith('/') ||
      !/^[a-zA-Z0-9/_.-]+$/.test(publicId)
    ) {
      throw AppError.badRequest('Invalid publicId', ErrorCodes.VALIDATION_ERROR);
    }
    await getStorageDriver().deleteFile(publicId);
    sendData(res, { deleted: true });
  }),
);

export default router;
