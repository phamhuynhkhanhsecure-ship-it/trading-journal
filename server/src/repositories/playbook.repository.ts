import { Playbook, IPlaybook } from '../models/Playbook.js';
import { Trade } from '../models/Trade.js';
import type { IPlaybookRepository } from '../interfaces/playbook.interfaces.js';

export class PlaybookRepository implements IPlaybookRepository {
  async findAll(userEmail: string): Promise<IPlaybook[]> {
    return Playbook.find({ userEmail }).sort({ sortOrder: 1, createdAt: 1 }).lean();
  }

  async findById(id: string, userEmail: string): Promise<IPlaybook | null> {
    return Playbook.findOne({ _id: id, userEmail }).lean();
  }

  async findMaxSortOrder(userEmail: string): Promise<number> {
    const doc = await Playbook.findOne({ userEmail }).sort({ sortOrder: -1 }).lean();
    return doc ? doc.sortOrder : -1;
  }

  async create(data: Partial<IPlaybook>): Promise<IPlaybook> {
    const playbook = new Playbook(data);
    await playbook.save();
    return playbook.toObject();
  }

  async update(id: string, userEmail: string, data: Partial<IPlaybook>): Promise<IPlaybook | null> {
    return Playbook.findOneAndUpdate(
      { _id: id, userEmail },
      { $set: data },
      { new: true },
    ).lean();
  }

  async delete(id: string, userEmail: string): Promise<IPlaybook | null> {
    return Playbook.findOneAndDelete({ _id: id, userEmail }).lean();
  }

  async clearPlaybookFromTrades(playbookId: string, userEmail: string): Promise<void> {
    await Trade.updateMany(
      { playbookId, userEmail },
      { $set: { playbookId: '' } },
    );
  }
}
