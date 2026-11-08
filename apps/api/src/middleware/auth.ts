import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '@engineering-lab/shared';
import { verifyAccessToken } from '../lib/jwt.js';
import { AppError } from '../utils/errors.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    next(AppError.unauthorized());
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next(AppError.unauthorized());
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.authUser = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.authUser = { id: payload.sub, role: payload.role };
  } catch {
    // Anonymous for catalog reads; invalid tokens are simply ignored.
  }
  next();
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.authUser) {
      next(AppError.unauthorized());
      return;
    }

    if (!roles.includes(req.authUser.role)) {
      next(AppError.forbidden());
      return;
    }

    next();
  };
}
