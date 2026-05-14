import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IJournalEntry {
  _id: string;
  date: string;
  content: string;
  mood: string;
  preMarketNotes: string;
  postMarketNotes: string;
  marketCondition: string;
  isChecklistDone: boolean;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
}

const JournalEntrySchema = new Schema<IJournalEntry>({
  _id: { type: String, default: () => uuidv4() },
  date: { type: String, required: true },
  content: { type: String, default: '' },
  mood: { type: String, default: 'neutral' },
  preMarketNotes: { type: String, default: '' },
  postMarketNotes: { type: String, default: '' },
  marketCondition: { type: String, default: '' },
  isChecklistDone: { type: Boolean, default: false },
  userEmail: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

JournalEntrySchema.index({ date: 1, userEmail: 1 }, { unique: true });

export const JournalEntry = mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema);
