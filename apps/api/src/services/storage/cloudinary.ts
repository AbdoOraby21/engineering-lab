import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import type {
  StorageDriver,
  StoredFile,
  StoredImage,
  UploadDatasheetInput,
  UploadImageInput,
} from './types.js';

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
  bytes?: number;
  width?: number;
  height?: number;
  eager?: Array<{ secure_url?: string; width?: number; height?: number }>;
  error?: { message?: string };
}

interface CloudinaryDestroyResponse {
  result?: string;
  error?: { message?: string };
}

function requireConfig(): { cloudName: string; apiKey: string; apiSecret: string } {
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are not configured');
  }
  return { cloudName, apiKey, apiSecret };
}

function sign(params: Record<string, string | number>, apiSecret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(body.error?.message ?? `Cloudinary request failed with ${response.status}`);
  }
  return body;
}

export const cloudinaryDriver: StorageDriver = {
  name: 'cloudinary',

  async uploadImage(input: UploadImageInput): Promise<StoredImage> {
    const { cloudName, apiKey, apiSecret } = requireConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = input.folder?.trim() || `${env.CLOUDINARY_FOLDER}/products`;
    const eager = 'c_limit,w_1600,q_auto,f_webp|c_fill,w_320,h_320,q_auto,f_webp';
    const paramsToSign = { eager, folder, timestamp };
    const signature = sign(paramsToSign, apiSecret);

    const form = new FormData();
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    form.append('folder', folder);
    form.append('eager', eager);
    form.append('file', new Blob([input.buffer], { type: input.mimeType }), input.originalName);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });
    const body = await parseResponse<CloudinaryUploadResponse>(response);

    if (!body.secure_url || !body.public_id) {
      throw new Error('Cloudinary did not return an uploaded image URL');
    }

    const thumbnail = body.eager?.find((entry) => entry.width === 320);

    return {
      url: body.secure_url,
      ...(thumbnail?.secure_url ? { thumbnailUrl: thumbnail.secure_url } : {}),
      publicId: body.public_id,
      driver: 'cloudinary',
      bytes: body.bytes ?? input.buffer.byteLength,
      ...(body.width === undefined ? {} : { width: body.width }),
      ...(body.height === undefined ? {} : { height: body.height }),
    };
  },

  async uploadDatasheet(input: UploadDatasheetInput): Promise<StoredFile> {
    const { cloudName, apiKey, apiSecret } = requireConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = input.folder?.trim() || `${env.CLOUDINARY_FOLDER}/datasheets`;
    const signature = sign({ folder, timestamp }, apiSecret);

    const form = new FormData();
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    form.append('folder', folder);
    form.append('file', new Blob([input.buffer], { type: 'application/pdf' }), input.originalName);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
      method: 'POST',
      body: form,
    });
    const body = await parseResponse<CloudinaryUploadResponse>(response);

    if (!body.secure_url || !body.public_id) {
      throw new Error('Cloudinary did not return an uploaded file URL');
    }

    return {
      url: body.secure_url,
      publicId: body.public_id,
      driver: 'cloudinary',
      bytes: body.bytes ?? input.buffer.byteLength,
    };
  },

  async deleteFile(publicId: string): Promise<void> {
    const { cloudName, apiKey, apiSecret } = requireConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const resourceType = /\.pdf$/i.test(publicId) ? 'raw' : 'image';
    const signature = sign({ public_id: publicId, timestamp }, apiSecret);

    const form = new FormData();
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    form.append('public_id', publicId);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
      { method: 'POST', body: form },
    );
    const body = await parseResponse<CloudinaryDestroyResponse>(response);
    if (body.result !== 'ok' && body.result !== 'not_found') {
      throw new Error(`Cloudinary could not delete file: ${body.result ?? 'unknown'}`);
    }
  },
};
