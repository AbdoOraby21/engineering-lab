export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  EMAIL_ALREADY_VERIFIED: 'EMAIL_ALREADY_VERIFIED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  ADDRESS_NOT_FOUND: 'ADDRESS_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  BRAND_NOT_FOUND: 'BRAND_NOT_FOUND',
  TICKET_NOT_FOUND: 'TICKET_NOT_FOUND',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  PURCHASE_REQUIRED: 'PURCHASE_REQUIRED',
  CART_ITEM_NOT_FOUND: 'CART_ITEM_NOT_FOUND',
  REVIEW_ALREADY_EXISTS: 'REVIEW_ALREADY_EXISTS',
  REVIEW_NOT_FOUND: 'REVIEW_NOT_FOUND',
  BANNER_NOT_FOUND: 'BANNER_NOT_FOUND',
  PAGE_NOT_FOUND: 'PAGE_NOT_FOUND',
  BUNDLE_RULE_VIOLATION: 'BUNDLE_RULE_VIOLATION',
  CONFLICT_SLUG: 'CONFLICT_SLUG',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expose = statusCode < 500;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code: ErrorCode = ErrorCodes.VALIDATION_ERROR, details?: unknown) {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message = 'Authentication required', code: ErrorCode = ErrorCodes.UNAUTHORIZED) {
    return new AppError(401, code, message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(403, ErrorCodes.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found', code: ErrorCode = ErrorCodes.NOT_FOUND) {
    return new AppError(404, code, message);
  }

  static conflict(message: string, code: ErrorCode = ErrorCodes.CONFLICT) {
    return new AppError(409, code, message);
  }

  static unprocessable(
    message: string,
    code: ErrorCode = ErrorCodes.BUNDLE_RULE_VIOLATION,
    details?: unknown,
  ) {
    return new AppError(422, code, message, details);
  }
}
