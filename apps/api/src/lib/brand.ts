import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';

export const DEFAULT_LOGO_PATH = '/images/brand/logo-emblem-512.png';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MODULE_DIR, '../../..');
export const DEFAULT_LOGO_FILE = join(
  REPO_ROOT,
  'apps',
  'web',
  'public',
  'images',
  'brand',
  'logo-emblem-512.png',
);

export function defaultLogoUrl(): string {
  return `${env.WEB_URL.replace(/\/$/, '')}${DEFAULT_LOGO_PATH}`;
}

/**
 * Admin override (store.logoUrl) when set, otherwise the generated brand emblem.
 * Never writes settings, so an admin-configured value is never overwritten.
 */
export async function resolveLogoUrl(): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'store.logoUrl' } });
    const value = row?.value;
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  } catch {
    // fall back to the default emblem below
  }
  return defaultLogoUrl();
}

/** Load the logo as a Buffer for PDFKit (local default, uploads, or remote URL). */
export async function loadLogoBuffer(url?: string | null): Promise<Buffer | null> {
  const resolved = url?.trim() || defaultLogoUrl();
  try {
    if (resolved === defaultLogoUrl() || resolved.endsWith(DEFAULT_LOGO_PATH)) {
      if (existsSync(DEFAULT_LOGO_FILE)) {
        return readFileSync(DEFAULT_LOGO_FILE);
      }
    }
    if (resolved.startsWith('/uploads/')) {
      const file = join(env.UPLOAD_DIR, resolved.replace(/^\/uploads\//, ''));
      if (existsSync(file)) {
        return readFileSync(file);
      }
    }
    const response = await fetch(resolved);
    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }
  } catch {
    // fall through to the default emblem
  }
  try {
    if (existsSync(DEFAULT_LOGO_FILE)) {
      return readFileSync(DEFAULT_LOGO_FILE);
    }
  } catch {
    // ignore
  }
  return null;
}
