import multer from 'multer';
import { env } from '../config/env.js';
import { AppError, ErrorCodes } from '../utils/errors.js';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.UPLOAD_MAX_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      callback(
        AppError.badRequest(
          'Only JPEG, PNG or WebP images are allowed',
          ErrorCodes.UNSUPPORTED_FILE_TYPE,
        ),
      );
      return;
    }
    callback(null, true);
  },
});

const datasheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.DATASHEET_MAX_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== 'application/pdf') {
      callback(
        AppError.badRequest('Only PDF datasheets are allowed', ErrorCodes.UNSUPPORTED_FILE_TYPE),
      );
      return;
    }
    callback(null, true);
  },
});

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const name = (file.originalname ?? '').toLowerCase();
    const isCsv = name.endsWith('.csv') || file.mimetype === 'text/csv';
    const isXlsx =
      name.endsWith('.xlsx') ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (!isCsv && !isXlsx) {
      callback(
        AppError.badRequest(
          'Only .csv or .xlsx files are allowed for import',
          ErrorCodes.UNSUPPORTED_FILE_TYPE,
        ),
      );
      return;
    }
    callback(null, true);
  },
});

export const uploadSingleImage = imageUpload.single('image');
export const uploadSingleDatasheet = datasheetUpload.single('datasheet');
export const uploadImportFile = importUpload.single('file');
