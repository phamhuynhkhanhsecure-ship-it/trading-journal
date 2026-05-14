import type { IStorageProvider } from '../../interfaces/storage.interfaces.js';
import { GoogleDriveStorage } from './googleDrive.storage.js';
import { LocalStorage } from './local.storage.js';

/**
 * Factory function to create the appropriate storage provider.
 * Open/Closed Principle: To add S3 storage, just create a new class
 * and add one condition here — no other code changes needed.
 */
export function createStorageProvider(): IStorageProvider {
  const driveStorage = new GoogleDriveStorage();
  if (driveStorage.isConfigured()) {
    console.log('☁️  Google Drive storage: ENABLED');
    return driveStorage;
  }
  console.log('💾 Local disk storage: ENABLED (Google Drive not configured)');
  return new LocalStorage();
}
