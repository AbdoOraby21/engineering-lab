import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { env } from '../../config/env.js';
import type {
  StorageDriver,
  StoredFile,
  StoredImage,
  UploadDatasheetInput,
  UploadImageInput,
} from './types.js';

export const localUploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);

const MAX_IMAGE_DIMENSION = 1600;
const THUMBNAIL_DIMENSION = 320;

function safeFolder(folder: string | undefined, fallback: string): string {
  const requested = folder?.trim() || fallback;
  const normalized = requested.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!/^[a-zA-Z0-9/_-]+$/.test(normalized) || normalized.includes('..')) {
    return fallback;
  }
  return normalized;
}

function resolvePublicId(publicId: string): string {
  const resolved = path.resolve(localUploadRoot, publicId);
  const relative = path.relative(localUploadRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid storage path');
  }
  return resolved;
}

export { resolvePublicId };

function randomName(): string {
  return `${Date.now().toString(36)}-${randomBytes(9).toString('hex')}`;
}

function publicUrl(publicId: string): string {
  return `/uploads/${publicId}`;
}

export const localDriver: StorageDriver = {
  name: 'local',

  async uploadImage(input: UploadImageInput): Promise<StoredImage> {
    const folder = safeFolder(input.folder, 'products');
    const base = randomName();
    const publicId = `${folder}/${base}.webp`;
    const thumbPublicId = `${folder}/${base}-thumb.webp`;
    const absolutePath = resolvePublicId(publicId);
    const thumbAbsolutePath = resolvePublicId(thumbPublicId);

    const pipeline = sharp(input.buffer, { failOn: 'error', limitInputPixels: 40_000_000 }).rotate();

    const main = await pipeline
      .clone()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    const thumb = await pipeline
      .clone()
      .resize({ width: THUMBNAIL_DIMENSION, height: THUMBNAIL_DIMENSION, fit: 'cover' })
      .webp({ quality: 75 })
      .toBuffer();

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, main.data);
    await writeFile(thumbAbsolutePath, thumb);

    return {
      url: publicUrl(publicId),
      thumbnailUrl: publicUrl(thumbPublicId),
      publicId,
      driver: 'local',
      bytes: main.data.byteLength,
      width: main.info.width,
      height: main.info.height,
    };
  },

  async uploadDatasheet(input: UploadDatasheetInput): Promise<StoredFile> {
    const folder = safeFolder(input.folder, 'datasheets');
    const publicId = `${folder}/${randomName()}.pdf`;
    const absolutePath = resolvePublicId(publicId);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.buffer);

    return {
      url: publicUrl(publicId),
      publicId,
      driver: 'local',
      bytes: input.buffer.byteLength,
    };
  },

  async deleteFile(publicId: string): Promise<void> {
    const absolutePath = resolvePublicId(publicId);
    const candidates = [absolutePath];
    if (absolutePath.toLowerCase().endsWith('.webp') && !absolutePath.endsWith('-thumb.webp')) {
      candidates.push(absolutePath.replace(/\.webp$/i, '-thumb.webp'));
    }

    for (const candidate of candidates) {
      try {
        await unlink(candidate);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }
  },
};
