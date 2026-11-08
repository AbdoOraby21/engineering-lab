import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import multer from 'multer';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { logger } from '../lib/logger.js';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: ErrorCodes.NOT_FOUND,
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  } satisfies ErrorBody);
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  let statusCode = 500;
  let body: ErrorBody = {
    error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Something went wrong' },
  };

  const isZodError =
    error instanceof ZodError ||
    (typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'ZodError');

  if (isZodError) {
    const zodError = error as ZodError;
    statusCode = 422;
    body = {
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        details: zodError.flatten(),
      },
    };
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    body = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    };
  } else if (error instanceof multer.MulterError) {
    statusCode = 400;
    const isSizeError = error.code === 'LIMIT_FILE_SIZE';
    body = {
      error: {
        code: isSizeError ? ErrorCodes.FILE_TOO_LARGE : ErrorCodes.VALIDATION_ERROR,
        message: isSizeError ? 'File is too large' : error.message,
      },
    };
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      statusCode = 409;
      body = {
        error: {
          code: ErrorCodes.CONFLICT,
          message: 'A record with these values already exists',
          details: error.meta,
        },
      };
    } else if (error.code === 'P2025') {
      statusCode = 404;
      body = {
        error: { code: ErrorCodes.NOT_FOUND, message: 'Resource not found' },
      };
    } else {
      statusCode = 400;
      body = {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'The request could not be completed',
        },
      };
    }
  } else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    body = {
      error: { code: ErrorCodes.VALIDATION_ERROR, message: 'Invalid JSON body' },
    };
  }

  if (statusCode >= 500) {
    logger.error({ err: error, method: req.method, url: req.originalUrl }, 'Unhandled request error');
  } else {
    logger.debug({ code: body.error.code, method: req.method, url: req.originalUrl }, body.error.message);
  }

  res.status(statusCode).json(body);
}
