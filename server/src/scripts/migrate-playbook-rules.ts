import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import { Playbook } from '../models/Playbook.js';
import { Rule } from '../models/Rule.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://phamhuynhkhanhsecure_db_user:KhanhQuynh123456789@cluster0.89jzw2x.mongodb.net/trading_journal?retryWrites=true&w=majority&appName=Cluster0';

async function migrate() {
  console.log(`🔗 Connecting to MongoDB...`);
  await mongoose.connect(MONGODB_URI);
  console.log(`✅ Connected to MongoDB`);

  const playbooks = await Playbook.find({});
  const rules = await Rule.find({});

  console.log(`Found ${playbooks.length} playbooks and ${rules.length} rules.`);

  let migratedCount = 0;
  let skippedCount = 0;
  let notFoundRules = 0;

  for (const pb of playbooks) {
    let modified = false;
    const newSetupRules: string[] = [];

    for (const ruleItem of pb.setupRules) {
      // Check if it's already a UUID (very basic check)
      if (ruleItem.includes('-') && ruleItem.length === 36) {
        newSetupRules.push(ruleItem);
        continue;
      }

      // It's likely a text string. Let's find the matching rule.
      const matchedRule = rules.find(r => r.name.toLowerCase() === ruleItem.toLowerCase());
      if (matchedRule) {
        newSetupRules.push(matchedRule._id);
        modified = true;
      } else {
        // If no matching rule was found, log it and keep the original string
        // so it works with our fallback mechanism on frontend
        console.warn(`⚠️ Warning: Could not find Rule ID for text "${ruleItem}" in playbook "${pb.name}"`);
        newSetupRules.push(ruleItem);
        notFoundRules++;
      }
    }

    if (modified) {
      pb.setupRules = newSetupRules;
      await pb.save();
      migratedCount++;
      console.log(`✅ Migrated playbook "${pb.name}"`);
    } else {
      skippedCount++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Migrated (updated): ${migratedCount}`);
  console.log(`   ⏭️  Skipped (no change or already IDs): ${skippedCount}`);
  if (notFoundRules > 0) {
    console.log(`   ⚠️  Unmatched rule strings kept as text: ${notFoundRules}`);
  }

  console.log('\n🎉 Migration complete!');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
