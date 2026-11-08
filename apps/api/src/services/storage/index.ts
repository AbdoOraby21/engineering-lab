import { env } from '../../config/env.js';
import { cloudinaryDriver } from './cloudinary.js';
import { localDriver } from './local.js';
import type { StorageDriver } from './types.js';

export { localUploadRoot } from './local.js';
export type { StorageDriver, StoredFile, StoredImage, UploadDatasheetInput, UploadImageInput } from './types.js';

let cached: StorageDriver | undefined;

export function getStorageDriver(): StorageDriver {
  if (!cached) {
    cached = env.STORAGE_DRIVER === 'cloudinary' ? cloudinaryDriver : localDriver;
  }
  return cached;
}
