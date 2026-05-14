import { JournalEntry, IJournalEntry } from '../models/JournalEntry.js';
import type { IJournalRepository } from '../interfaces/journal.interfaces.js';

export class JournalRepository implements IJournalRepository {
  async findAll(filter: Record<string, any>, sort: Record<string, 1 | -1>): Promise<IJournalEntry[]> {
    return JournalEntry.find(filter).sort(sort).lean();
  }

  async findByDate(date: string, userEmail: string): Promise<IJournalEntry | null> {
    return JournalEntry.findOne({ date, userEmail }).lean();
  }

  /** Returns a Mongoose document (not lean) for in-place update. */
  async findMutableByDate(date: string, userEmail: string): Promise<any> {
    return JournalEntry.findOne({ date, userEmail });
  }

  async create(data: Partial<IJournalEntry>): Promise<IJournalEntry> {
    const entry = new JournalEntry(data);
    await entry.save();
    return entry.toObject();
  }

  async updateById(id: string, data: Partial<IJournalEntry>): Promise<IJournalEntry | null> {
    return JournalEntry.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
  }

  async deleteById(id: string): Promise<IJournalEntry | null> {
    return JournalEntry.findByIdAndDelete(id).lean();
  }
}
