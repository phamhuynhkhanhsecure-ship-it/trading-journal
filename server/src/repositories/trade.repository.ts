import { Trade, ITrade } from '../models/Trade.js';
import type { ITradeRepository } from '../interfaces/trade.interfaces.js';

export class TradeRepository implements ITradeRepository {
  async findAll(filter: Record<string, any>): Promise<ITrade[]> {
    return Trade.find(filter).sort({ date: 1, createdAt: 1 }).lean();
  }

  async findById(id: string, userEmail: string): Promise<ITrade | null> {
    return Trade.findOne({ _id: id, userEmail }).lean();
  }

  async create(data: Partial<ITrade>): Promise<ITrade> {
    const trade = new Trade(data);
    await trade.save();
    return trade.toObject();
  }

  async update(id: string, userEmail: string, data: Partial<ITrade>): Promise<ITrade | null> {
    return Trade.findOneAndUpdate(
      { _id: id, userEmail },
      { $set: data },
      { new: true },
    ).lean();
  }

  async delete(id: string, userEmail: string): Promise<ITrade | null> {
    return Trade.findOneAndDelete({ _id: id, userEmail }).lean();
  }

  /** Returns a Mongoose document (not lean) for in-place mutation (e.g. images.push). */
  async findMutable(id: string, userEmail: string): Promise<any> {
    return Trade.findOne({ _id: id, userEmail });
  }

  async findWithImages(userEmail: string): Promise<ITrade[]> {
    return Trade.find({ userEmail, 'images.0': { $exists: true } })
      .select('_id date instrument side pnl images')
      .sort({ date: -1 })
      .lean();
  }

  async insertMany(docs: Partial<ITrade>[]): Promise<ITrade[]> {
    const created = await Trade.insertMany(docs);
    return created.map(d => d.toObject());
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return Trade.aggregate(pipeline);
  }
}
