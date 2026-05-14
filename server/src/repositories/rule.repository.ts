import { Rule, IRule } from '../models/Rule.js';
import type { IRuleRepository } from '../interfaces/rule.interfaces.js';

export class RuleRepository implements IRuleRepository {
  async findAll(filter: Record<string, any>): Promise<IRule[]> {
    return Rule.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean();
  }

  async findById(id: string, userEmail: string): Promise<IRule | null> {
    return Rule.findOne({ _id: id, userEmail }).lean();
  }

  async findMaxSortOrder(userEmail: string): Promise<number> {
    const doc = await Rule.findOne({ userEmail }).sort({ sortOrder: -1 }).lean();
    return doc ? doc.sortOrder : -1;
  }

  async create(data: Partial<IRule>): Promise<IRule> {
    const rule = new Rule(data);
    await rule.save();
    return rule.toObject();
  }

  async update(id: string, userEmail: string, data: Partial<IRule>): Promise<IRule | null> {
    return Rule.findOneAndUpdate(
      { _id: id, userEmail },
      { $set: data },
      { new: true },
    ).lean();
  }

  async delete(id: string, userEmail: string): Promise<IRule | null> {
    return Rule.findOneAndDelete({ _id: id, userEmail }).lean();
  }

  async bulkUpdateSortOrder(
    order: { id: string; sortOrder: number }[],
    userEmail: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const ops = order.map(item => ({
      updateOne: {
        filter: { _id: item.id, userEmail },
        update: { $set: { sortOrder: item.sortOrder, updatedAt: now } },
      },
    }));
    await Rule.bulkWrite(ops);
  }
}
