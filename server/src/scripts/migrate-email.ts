import { connectDB } from '../db.js';
import mongoose from 'mongoose';
import { Trade } from '../models/Trade.js';
import { JournalEntry } from '../models/JournalEntry.js';
import { Playbook } from '../models/Playbook.js';
import { Rule } from '../models/Rule.js';
import { Tag } from '../models/Tag.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function runMigration() {
  const emailArgs = process.argv.slice(2);
  const targetEmail = emailArgs[0];

  if (!targetEmail) {
    console.error('Usage: npx tsx src/scripts/migrate-email.ts <your-email@gmail.com>');
    process.exit(1);
  }

  console.log(`Connecting to database to map existing data to: ${targetEmail}`);
  await connectDB();

  try {
    const tradeRes = await Trade.updateMany({ userEmail: { $exists: false } }, { $set: { userEmail: targetEmail } });
    console.log(`Trades updated: ${tradeRes.modifiedCount}`);

    const journalRes = await JournalEntry.updateMany({ userEmail: { $exists: false } }, { $set: { userEmail: targetEmail } });
    console.log(`Journal Entries updated: ${journalRes.modifiedCount}`);

    const pbRes = await Playbook.updateMany({ userEmail: { $exists: false } }, { $set: { userEmail: targetEmail } });
    console.log(`Playbooks updated: ${pbRes.modifiedCount}`);

    const ruleRes = await Rule.updateMany({ userEmail: { $exists: false } }, { $set: { userEmail: targetEmail } });
    console.log(`Rules updated: ${ruleRes.modifiedCount}`);

    const tagRes = await Tag.updateMany({ userEmail: { $exists: false } }, { $set: { userEmail: targetEmail } });
    console.log(`Tags updated: ${tagRes.modifiedCount}`);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runMigration();
