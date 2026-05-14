import { v4 as uuidv4 } from 'uuid';
import type { ITradeService, ITradeRepository, ITradeMapper } from '../interfaces/trade.interfaces.js';
import type { IRuleRepository } from '../interfaces/rule.interfaces.js';
import type { Trade as TradeDTO, TradeCreateInput, TradeUpdateInput, TradeFilter } from '../types.js';
import { NotFoundError } from '../errors/NotFoundError.js';

/**
 * Trade business logic service.
 * Depends on abstractions (ITradeRepository, IRuleRepository, ITradeMapper) — DIP.
 * Single Responsibility: only trade CRUD business rules.
 */
export class TradeService implements ITradeService {
  constructor(
    private readonly tradeRepo: ITradeRepository,
    private readonly ruleRepo: IRuleRepository,
    private readonly mapper: ITradeMapper,
  ) {}

  async getAll(filter: TradeFilter, userEmail: string): Promise<TradeDTO[]> {
    const mongoFilter = this.buildMongoFilter(filter, userEmail);
    const docs = await this.tradeRepo.findAll(mongoFilter);
    return this.mapper.toDTOList(docs);
  }

  async getById(id: string, userEmail: string): Promise<TradeDTO> {
    const doc = await this.tradeRepo.findById(id, userEmail);
    if (!doc) throw new NotFoundError('Trade');
    return this.mapper.toDTO(doc);
  }

  async create(input: TradeCreateInput, userEmail: string): Promise<TradeDTO> {
    const now = new Date().toISOString();
    const id = uuidv4();
    const ruleChecklist = await this.resolveRuleChecklist(input.ruleChecklist);

    const doc = await this.tradeRepo.create({
      _id: id,
      userEmail,
      date: input.date,
      instrument: input.instrument,
      side: input.side,
      entryPrice: input.entryPrice || 0,
      exitPrice: input.exitPrice || 0,
      quantity: input.quantity || 0,
      pnl: input.pnl || 0,
      fees: input.fees || 0,
      notes: input.notes || '',
      tags: input.tags || [],
      ruleChecklist,
      stopLoss: input.stopLoss || 0,
      takeProfit: input.takeProfit || 0,
      rating: input.rating || 0,
      playbookId: input.playbookId || '',
      reviewNotes: input.reviewNotes || '',
      mistakes: input.mistakes || '',
      lessons: input.lessons || '',
      createdAt: now,
      updatedAt: now,
    } as any);

    return this.mapper.toDTO(doc);
  }

  async update(id: string, input: TradeUpdateInput, userEmail: string): Promise<TradeDTO> {
    const existing = await this.tradeRepo.findById(id, userEmail);
    if (!existing) throw new NotFoundError('Trade');

    const now = new Date().toISOString();
    const updateData: Record<string, any> = { updatedAt: now };

    // Copy defined fields
    const fields = [
      'date', 'instrument', 'side', 'entryPrice', 'exitPrice', 'quantity',
      'pnl', 'fees', 'notes', 'tags', 'stopLoss', 'takeProfit', 'rating',
      'playbookId', 'reviewNotes', 'mistakes', 'lessons',
    ] as const;
    for (const field of fields) {
      if ((input as any)[field] !== undefined) updateData[field] = (input as any)[field];
    }

    // Resolve rule checklist
    if (input.ruleChecklist !== undefined) {
      updateData.ruleChecklist = await this.resolveRuleChecklist(input.ruleChecklist);
    }

    const updated = await this.tradeRepo.update(id, userEmail, updateData);
    return this.mapper.toDTO(updated);
  }

  async delete(id: string, userEmail: string): Promise<TradeDTO> {
    const existing = await this.tradeRepo.findById(id, userEmail);
    if (!existing) throw new NotFoundError('Trade');
    const dto = this.mapper.toDTO(existing);
    await this.tradeRepo.delete(id, userEmail);
    return dto;
  }

  async bulkCreate(trades: TradeCreateInput[], userEmail: string): Promise<TradeDTO[]> {
    const now = new Date().toISOString();

    // Collect all rule IDs for batch lookup
    const allRuleIds = new Set<string>();
    for (const input of trades) {
      if (input.ruleChecklist) {
        for (const r of input.ruleChecklist) allRuleIds.add(r.ruleId);
      }
    }
    const rules = await this.ruleRepo.findAll({ _id: { $in: Array.from(allRuleIds) } });
    const ruleMap = new Map(rules.map(r => [r._id, r.name]));

    const docs = trades.map(input => ({
      _id: uuidv4(),
      userEmail,
      date: input.date,
      instrument: input.instrument,
      side: input.side,
      entryPrice: input.entryPrice || 0,
      exitPrice: input.exitPrice || 0,
      quantity: input.quantity || 0,
      pnl: input.pnl || 0,
      fees: input.fees || 0,
      notes: input.notes || '',
      tags: input.tags || [],
      ruleChecklist: (input.ruleChecklist || []).map(r => ({
        ruleId: r.ruleId,
        ruleName: ruleMap.get(r.ruleId) || 'Unknown',
        followed: r.followed,
      })),
      stopLoss: input.stopLoss || 0,
      takeProfit: input.takeProfit || 0,
      rating: input.rating || 0,
      playbookId: input.playbookId || '',
      reviewNotes: input.reviewNotes || '',
      mistakes: input.mistakes || '',
      lessons: input.lessons || '',
      createdAt: now,
      updatedAt: now,
    }));

    const created = await this.tradeRepo.insertMany(docs);
    return this.mapper.toDTOList(created);
  }

  // ===== Private helpers =====

  private buildMongoFilter(filter: TradeFilter, userEmail: string): Record<string, any> {
    const mf: Record<string, any> = { userEmail };

    if (filter.year && filter.month) {
      const datePrefix = `${filter.year}-${String(filter.month).padStart(2, '0')}`;
      mf.date = { $regex: `^${datePrefix}` };
    }
    if (filter.dateFrom || filter.dateTo) {
      mf.date = mf.date || {};
      if (filter.dateFrom) mf.date.$gte = filter.dateFrom;
      if (filter.dateTo) mf.date.$lte = filter.dateTo;
    }
    if (filter.instrument) mf.instrument = filter.instrument;
    if (filter.side) mf.side = filter.side;
    if (filter.pnlMin || filter.pnlMax) {
      mf.pnl = {};
      if (filter.pnlMin) mf.pnl.$gte = filter.pnlMin;
      if (filter.pnlMax) mf.pnl.$lte = filter.pnlMax;
    }
    if (filter.search) {
      mf.$or = [
        { notes: { $regex: filter.search, $options: 'i' } },
        { instrument: { $regex: filter.search, $options: 'i' } },
      ];
    }
    if (filter.playbookId) mf.playbookId = filter.playbookId;
    if (filter.rating) mf.rating = { $gte: filter.rating };
    if (filter.tag) mf.tags = filter.tag;

    return mf;
  }

  private async resolveRuleChecklist(
    checklist?: { ruleId: string; followed: boolean }[],
  ): Promise<{ ruleId: string; ruleName: string; followed: boolean }[]> {
    if (!checklist?.length) return [];
    const ruleIds = checklist.map(r => r.ruleId);
    const rules = await this.ruleRepo.findAll({ _id: { $in: ruleIds } });
    const ruleMap = new Map(rules.map(r => [r._id, r.name]));
    return checklist.map(r => ({
      ruleId: r.ruleId,
      ruleName: ruleMap.get(r.ruleId) || 'Unknown',
      followed: r.followed,
    }));
  }
}
