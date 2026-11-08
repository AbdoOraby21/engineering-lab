export type StorageDriverName = 'local' | 'cloudinary';

export interface UploadImageInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folder?: string;
}

export interface UploadDatasheetInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folder?: string;
}

export interface StoredImage {
  url: string;
  thumbnailUrl?: string;
  publicId: string;
  driver: StorageDriverName;
  bytes: number;
  width?: number;
  height?: number;
}

export interface StoredFile {
  url: string;
  publicId: string;
  driver: StorageDriverName;
  bytes: number;
}

export interface StorageDriver {
  readonly name: StorageDriverName;
  uploadImage(input: UploadImageInput): Promise<StoredImage>;
  uploadDatasheet(input: UploadDatasheetInput): Promise<StoredFile>;
  deleteFile(publicId: string): Promise<void>;
}
