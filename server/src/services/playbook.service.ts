import { v4 as uuidv4 } from 'uuid';
import type { IPlaybookService, IPlaybookRepository, IPlaybookMapper } from '../interfaces/playbook.interfaces.js';
import type { ITradeRepository } from '../interfaces/trade.interfaces.js';
import type { Playbook as PlaybookDTO, PlaybookCreateInput, PlaybookUpdateInput, PlaybookWithStats } from '../types.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { ValidationError } from '../errors/ValidationError.js';

export class PlaybookService implements IPlaybookService {
  constructor(
    private readonly playbookRepo: IPlaybookRepository,
    private readonly tradeRepo: ITradeRepository,
    private readonly mapper: IPlaybookMapper,
  ) {}

  async getAll(userEmail: string): Promise<PlaybookWithStats[]> {
    const docs = await this.playbookRepo.findAll(userEmail);
    return Promise.all(docs.map(doc => this.enrichWithStats(doc, userEmail)));
  }

  async getById(id: string, userEmail: string): Promise<PlaybookWithStats> {
    const doc = await this.playbookRepo.findById(id, userEmail);
    if (!doc) throw new NotFoundError('Playbook');
    return this.enrichWithStats(doc, userEmail);
  }

  async create(input: PlaybookCreateInput, userEmail: string): Promise<PlaybookWithStats> {
    if (!input.name?.trim()) throw new ValidationError('Playbook name is required');

    const now = new Date().toISOString();
    const maxSort = await this.playbookRepo.findMaxSortOrder(userEmail);

    const doc = await this.playbookRepo.create({
      _id: uuidv4(),
      userEmail,
      name: input.name.trim(),
      description: input.description || '',
      setupRules: input.setupRules || [],
      entryCriteria: input.entryCriteria || '',
      exitCriteria: input.exitCriteria || '',
      riskRules: input.riskRules || '',
      color: input.color || '#58a6ff',
      isActive: true,
      sortOrder: maxSort + 1,
      createdAt: now,
      updatedAt: now,
    } as any);

    return this.enrichWithStats(doc, userEmail);
  }

  async update(id: string, input: PlaybookUpdateInput, userEmail: string): Promise<PlaybookWithStats> {
    const existing = await this.playbookRepo.findById(id, userEmail);
    if (!existing) throw new NotFoundError('Playbook');

    const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.description !== undefined) updateData.description = input.description;
    if (input.setupRules !== undefined) updateData.setupRules = input.setupRules;
    if (input.entryCriteria !== undefined) updateData.entryCriteria = input.entryCriteria;
    if (input.exitCriteria !== undefined) updateData.exitCriteria = input.exitCriteria;
    if (input.riskRules !== undefined) updateData.riskRules = input.riskRules;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

    const updated = await this.playbookRepo.update(id, userEmail, updateData);
    return this.enrichWithStats(updated, userEmail);
  }

  async delete(id: string, userEmail: string): Promise<PlaybookDTO> {
    const existing = await this.playbookRepo.findById(id, userEmail);
    if (!existing) throw new NotFoundError('Playbook');
    await this.playbookRepo.clearPlaybookFromTrades(id, userEmail);
    await this.playbookRepo.delete(id, userEmail);
    return this.mapper.toDTO(existing);
  }

  /** Enrich a playbook with trade statistics. */
  private async enrichWithStats(doc: any, userEmail: string): Promise<PlaybookWithStats> {
    const pb = this.mapper.toDTO(doc);
    const trades = await this.tradeRepo.findAll({ playbookId: pb.id, userEmail });
    const total = trades.length;
    const wins = trades.filter(t => t.pnl > 0).length;
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
    return {
      ...pb,
      tradeCount: total,
      winCount: wins,
      totalPnl,
      avgPnl: total > 0 ? totalPnl / total : 0,
      winRate: total > 0 ? (wins / total * 100) : 0,
    };
  }
}
