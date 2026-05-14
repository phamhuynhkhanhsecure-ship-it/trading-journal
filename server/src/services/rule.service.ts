import { v4 as uuidv4 } from 'uuid';
import type { IRuleService, IRuleRepository, IRuleMapper } from '../interfaces/rule.interfaces.js';
import type { Rule as RuleDTO, RuleCreateInput, RuleUpdateInput } from '../types.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { ValidationError } from '../errors/ValidationError.js';

export class RuleService implements IRuleService {
  constructor(
    private readonly ruleRepo: IRuleRepository,
    private readonly mapper: IRuleMapper,
  ) {}

  async getAll(userEmail: string, activeOnly?: boolean): Promise<RuleDTO[]> {
    const filter: Record<string, any> = { userEmail };
    if (activeOnly) filter.isActive = true;
    const docs = await this.ruleRepo.findAll(filter);
    return this.mapper.toDTOList(docs);
  }

  async create(input: RuleCreateInput, userEmail: string): Promise<RuleDTO> {
    if (!input.name?.trim()) throw new ValidationError('Rule name is required');

    const now = new Date().toISOString();
    const maxSort = await this.ruleRepo.findMaxSortOrder(userEmail);

    const doc = await this.ruleRepo.create({
      _id: uuidv4(),
      userEmail,
      name: input.name.trim(),
      description: input.description || '',
      category: input.category || 'general',
      isActive: true,
      sortOrder: maxSort + 1,
      createdAt: now,
      updatedAt: now,
    } as any);

    return this.mapper.toDTO(doc);
  }

  async update(id: string, input: RuleUpdateInput, userEmail: string): Promise<RuleDTO> {
    const existing = await this.ruleRepo.findById(id, userEmail);
    if (!existing) throw new NotFoundError('Rule');

    const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.description !== undefined) updateData.description = input.description;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

    const updated = await this.ruleRepo.update(id, userEmail, updateData);
    return this.mapper.toDTO(updated);
  }

  async delete(id: string, userEmail: string): Promise<RuleDTO> {
    const existing = await this.ruleRepo.findById(id, userEmail);
    if (!existing) throw new NotFoundError('Rule');
    await this.ruleRepo.delete(id, userEmail);
    return this.mapper.toDTO(existing);
  }

  async reorder(order: { id: string; sortOrder: number }[], userEmail: string): Promise<void> {
    if (!Array.isArray(order)) throw new ValidationError('Invalid order data');
    await this.ruleRepo.bulkUpdateSortOrder(order, userEmail);
  }
}
