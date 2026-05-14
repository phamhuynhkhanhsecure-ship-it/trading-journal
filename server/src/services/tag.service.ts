import { v4 as uuidv4 } from 'uuid';
import type { ITagService, ITagRepository, ITagMapper } from '../interfaces/tag.interfaces.js';
import type { ITradeRepository } from '../interfaces/trade.interfaces.js';
import type { Tag as TagDTO, TagCreateInput, TagUpdateInput, TagWithUsage } from '../types.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { ValidationError } from '../errors/ValidationError.js';
import { ConflictError } from '../errors/ConflictError.js';

export class TagService implements ITagService {
  constructor(
    private readonly tagRepo: ITagRepository,
    private readonly tradeRepo: ITradeRepository,
    private readonly mapper: ITagMapper,
  ) {}

  async getAll(userEmail: string): Promise<TagWithUsage[]> {
    const docs = await this.tagRepo.findAll(userEmail);
    const tags = this.mapper.toDTOList(docs);

    // Count usage from trades
    const trades = await this.tradeRepo.findAll({ userEmail });
    const usageMap: Record<string, number> = {};
    for (const t of trades) {
      for (const tn of (t as any).tags || []) {
        usageMap[tn.toLowerCase()] = (usageMap[tn.toLowerCase()] || 0) + 1;
      }
    }

    return tags.map(tag => ({
      ...tag,
      usageCount: usageMap[tag.name.toLowerCase()] || 0,
    }));
  }

  async getSuggestions(userEmail: string): Promise<string[]> {
    const trades = await this.tradeRepo.findAll({ userEmail });
    const uniqueTags = new Set<string>();
    for (const t of trades) {
      for (const tag of ((t as any).tags || [])) {
        if (tag.trim()) uniqueTags.add(tag.trim());
      }
    }
    return Array.from(uniqueTags).sort();
  }

  async create(input: TagCreateInput, userEmail: string): Promise<TagDTO> {
    if (!input.name?.trim()) throw new ValidationError('Tag name is required');

    const dup = await this.tagRepo.findDuplicate(input.name.trim(), userEmail);
    if (dup) throw new ConflictError('Tag already exists');

    const doc = await this.tagRepo.create({
      _id: uuidv4(),
      userEmail,
      name: input.name.trim(),
      color: input.color || '#58a6ff',
      createdAt: new Date().toISOString(),
    } as any);

    return this.mapper.toDTO(doc);
  }

  async update(id: string, input: TagUpdateInput, userEmail: string): Promise<TagDTO> {
    const existing = await this.tagRepo.findById(id, userEmail);
    if (!existing) throw new NotFoundError('Tag');

    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.color !== undefined) updateData.color = input.color;

    const updated = await this.tagRepo.update(id, userEmail, updateData);
    return this.mapper.toDTO(updated);
  }

  async delete(id: string, userEmail: string): Promise<TagDTO> {
    const existing = await this.tagRepo.findById(id, userEmail);
    if (!existing) throw new NotFoundError('Tag');
    await this.tagRepo.delete(id, userEmail);
    return this.mapper.toDTO(existing);
  }
}
