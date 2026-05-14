import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import type { IStorageProvider } from '../../interfaces/storage.interfaces.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', '..', 'data', 'uploads');

/**
 * Local filesystem storage provider.
 * Implements IStorageProvider — fallback when Google Drive is not configured.
 */
export class LocalStorage implements IStorageProvider {
  async upload(buffer: Buffer, filename: string, _mimeType: string): Promise<string> {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
    console.log(`💾 Saved locally: ${filename}`);
    return ''; // No external ID — filename is the identifier
  }

  async delete(fileId: string): Promise<void> {
    // For local storage, fileId is empty — deletion is handled by filename elsewhere.
    // This is a no-op for the interface contract.
    if (fileId) {
      console.warn(`LocalStorage.delete called with fileId=${fileId} — ignoring`);
    }
  }

  async getStream(_fileId: string): Promise<{ stream: Readable; mimeType: string; size: number }> {
    throw new Error('LocalStorage does not support stream access via fileId. Use static file serving.');
  }

  isConfigured(): boolean {
    return true; // Always available as fallback
  }
}
