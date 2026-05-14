import { Readable } from 'stream';

/** Contract for file storage providers (Google Drive, Local disk, S3, etc.) */
export interface IStorageProvider {
  /** Upload a file buffer and return a storage identifier. */
  upload(buffer: Buffer, filename: string, mimeType: string): Promise<string>;

  /** Delete a file by its storage identifier. */
  delete(fileId: string): Promise<void>;

  /** Get a readable stream + metadata for a stored file. */
  getStream(fileId: string): Promise<{ stream: Readable; mimeType: string; size: number }>;

  /** Whether this provider is properly configured and ready to use. */
  isConfigured(): boolean;
}
