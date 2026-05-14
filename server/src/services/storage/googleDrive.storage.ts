import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import type { IStorageProvider } from '../../interfaces/storage.interfaces.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

/**
 * Google Drive storage provider.
 * Implements IStorageProvider — can be swapped with LocalStorage or S3Storage.
 */
export class GoogleDriveStorage implements IStorageProvider {
  private driveClient: drive_v3.Drive | null = null;

  private getDrive(): drive_v3.Drive {
    if (this.driveClient) return this.driveClient;

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      throw new Error('Google OAuth2 credentials not set in .env');
    }
    if (!FOLDER_ID) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in .env');
    }

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    this.driveClient = google.drive({ version: 'v3', auth: oauth2Client });
    return this.driveClient;
  }

  async upload(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    const drive = this.getDrive();
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const res = await drive.files.create({
      requestBody: { name: filename, parents: [FOLDER_ID] },
      media: { mimeType, body: stream },
      fields: 'id',
    });

    const fileId = res.data.id;
    if (!fileId) throw new Error('Google Drive upload failed — no file ID returned');
    console.log(`📤 Uploaded to Google Drive: ${filename} → ${fileId}`);
    return fileId;
  }

  async delete(fileId: string): Promise<void> {
    const drive = this.getDrive();
    try {
      await drive.files.delete({ fileId });
      console.log(`🗑️ Deleted from Google Drive: ${fileId}`);
    } catch (err: any) {
      if (err?.code === 404) {
        console.warn(`⚠️ File not found on Drive (already deleted?): ${fileId}`);
        return;
      }
      throw err;
    }
  }

  async getStream(fileId: string): Promise<{ stream: Readable; mimeType: string; size: number }> {
    const drive = this.getDrive();
    const meta = await drive.files.get({ fileId, fields: 'mimeType,size' });
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' },
    );
    return {
      stream: res.data as unknown as Readable,
      mimeType: meta.data.mimeType || 'application/octet-stream',
      size: parseInt(meta.data.size || '0', 10),
    };
  }

  isConfigured(): boolean {
    return !!CLIENT_ID && !!CLIENT_SECRET && !!REFRESH_TOKEN && !!FOLDER_ID;
  }
}
