import type { CookieOptions, Response } from 'express';
import { env } from '../config/env.js';

export const REFRESH_COOKIE_NAME = 'el_refresh';
const COOKIE_PATH = '/api/v1';

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: COOKIE_PATH,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_COOKIE_NAME, token, { ...baseOptions(), expires: expiresAt });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions());
}

export function readRefreshCookie(cookies: unknown): string | undefined {
  if (!cookies || typeof cookies !== 'object') {
    return undefined;
  }
  const value = (cookies as Record<string, unknown>)[REFRESH_COOKIE_NAME];
  return typeof value === 'string' ? value : undefined;
}
