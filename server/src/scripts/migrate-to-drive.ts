/**
 * Migration script: Upload existing local images to Google Drive
 * and update MongoDB records with driveFileId.
 *
 * Usage: npx tsx src/scripts/migrate-to-drive.ts
 */
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import dns from 'dns';
import { GoogleDriveStorage } from '../services/storage/googleDrive.storage.js';

const driveStorage = new GoogleDriveStorage();
const isDriveConfigured = () => driveStorage.isConfigured();
const uploadFileToDrive = (buffer: Buffer, filename: string, mimeType: string) => driveStorage.upload(buffer, filename, mimeType);
import { Trade } from '../models/Trade.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Fix DNS for MongoDB Atlas SRV
dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGO_URI = 'mongodb+srv://phamhuynhkhanhsecure_db_user:KhanhQuynh123456789@cluster0.89jzw2x.mongodb.net/trading_journal?retryWrites=true&w=majority&appName=Cluster0';
const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'data', 'uploads');

async function migrate() {
  if (!isDriveConfigured()) {
    console.error('❌ Google Drive is not configured. Please set GOOGLE_CREDENTIALS_PATH and GOOGLE_DRIVE_FOLDER_ID in .env');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Find all trades with images that don't have driveFileId
  const trades = await Trade.find({
    'images.0': { $exists: true },
  });

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const trade of trades) {
    let modified = false;

    for (const img of trade.images) {
      // Skip if already migrated
      if (img.driveFileId) {
        totalSkipped++;
        continue;
      }

      const filePath = path.join(UPLOADS_DIR, img.filename);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ File not found: ${filePath} (trade ${trade._id})`);
        totalErrors++;
        continue;
      }

      try {
        const buffer = fs.readFileSync(filePath);
        const driveFileId = await uploadFileToDrive(buffer, img.filename, img.mimeType);
        img.driveFileId = driveFileId;
        modified = true;
        totalMigrated++;
        console.log(`✅ Migrated: ${img.originalName} → ${driveFileId}`);
      } catch (err) {
        console.error(`❌ Failed to migrate ${img.originalName}:`, err);
        totalErrors++;
      }
    }

    if (modified) {
      await trade.save();
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${totalMigrated}`);
  console.log(`   ⏭️  Skipped (already migrated): ${totalSkipped}`);
  console.log(`   ❌ Errors: ${totalErrors}`);

  await mongoose.disconnect();
  console.log('\n🎉 Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
