import type { Request, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ErrorCodes } from '../utils/errors.js';

function rateLimitHandler(_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }): void {
  res.status(429).json({
    error: {
      code: ErrorCodes.RATE_LIMITED,
      message: 'Too many requests. Please try again later.',
    },
  });
}

function keyFromUserOrIp(req: Request): string {
  const userId = (req as { authUser?: { id?: string } }).authUser?.id;
  return `u:${userId ?? req.ip ?? 'unknown'}`;
}

function keyFromIp(req: Request): string {
  return `ip:${req.ip ?? 'unknown'}`;
}

// Baseline global limit (per-IP).
export const globalLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,

  keyGenerator: keyFromIp,
  handler: rateLimitHandler,
});

// Per-user/IP limit for authenticated routes.
export function userIpLimiter(options: { windowMs: number; limit: number }): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  
    keyGenerator: keyFromUserOrIp,
    handler: rateLimitHandler,
  });
}

// IP-based limit for public/auth routes.
export function ipLimiter(options: { windowMs: number; limit: number }): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  
    keyGenerator: keyFromIp,
    handler: rateLimitHandler,
  });
}

export const authLimiter: RequestHandler = ipLimiter({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
});

export const contactLimiter: RequestHandler = ipLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 5,
});

export const uploadLimiter: RequestHandler = ipLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 30,
});

export const checkoutLimiter: RequestHandler = userIpLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 20,
});

export const couponLimiter: RequestHandler = userIpLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 30,
});

export const newsletterLimiter: RequestHandler = ipLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 10,
});

// ---------------------------------------------------------------------------
// Login failure lockout (per email + IP, exponential backoff, in-memory).
// Note: in multi-instance production deploys this should be backed by Redis.
// ---------------------------------------------------------------------------

const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

interface LockoutRecord {
  count: number;
  firstFailedAt: number;
}

const loginFailures = new Map<string, LockoutRecord>();

function lockoutKey(email: string, ip: string): string {
  return `${email.toLowerCase()}|${ip}`;
}

function pruneStale(): void {
  const now = Date.now();
  for (const [key, record] of loginFailures.entries()) {
    if (now - record.firstFailedAt > LOCKOUT_WINDOW_MS) {
      loginFailures.delete(key);
    }
  }
}

export function registerLoginFailure(email: string, ip: string): void {
  pruneStale();
  const key = lockoutKey(email, ip);
  const record = loginFailures.get(key) ?? { count: 0, firstFailedAt: Date.now() };
  record.count += 1;
  record.firstFailedAt = record.firstFailedAt ?? Date.now();
  loginFailures.set(key, record);
}

export function clearLoginFailures(email: string, ip: string): void {
  loginFailures.delete(lockoutKey(email, ip));
}

export function loginLockout(email: string, ip: string): { locked: boolean; retryAfterMs: number } {
  pruneStale();
  const record = loginFailures.get(lockoutKey(email, ip));
  if (!record || record.count < MAX_FAILED_ATTEMPTS) {
    return { locked: false, retryAfterMs: 0 };
  }
  const retryAfterMs = Math.max(
    0,
    LOCKOUT_WINDOW_MS - (Date.now() - record.firstFailedAt),
  );
  return { locked: true, retryAfterMs };
}

export function loginLimiter(req: Request, res: { status: (c: number) => { json: (b: unknown) => void } }, next: (err?: unknown) => void): void {
  const email = (req.body as { email?: string } | undefined)?.email ?? '';
  const ip = req.ip ?? 'unknown';
  const { locked, retryAfterMs } = loginLockout(email, ip);
  if (locked) {
    res.status(429).json({
      error: {
        code: ErrorCodes.RATE_LIMITED,
        message: `Too many failed attempts. Try again in ${Math.ceil(retryAfterMs / 1000)} second(s).`,
        retryAfterMs,
      },
    });
    return;
  }
  next();
}

