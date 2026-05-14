import type { IRule } from '../models/Rule.js';
import type { Rule as RuleDTO, RuleCreateInput, RuleUpdateInput } from '../types.js';

// ===== Repository =====

export interface IRuleRepository {
  findAll(filter: Record<string, any>): Promise<IRule[]>;
  findById(id: string, userEmail: string): Promise<IRule | null>;
  findMaxSortOrder(userEmail: string): Promise<number>;
  create(data: Partial<IRule>): Promise<IRule>;
  update(id: string, userEmail: string, data: Partial<IRule>): Promise<IRule | null>;
  delete(id: string, userEmail: string): Promise<IRule | null>;
  bulkUpdateSortOrder(order: { id: string; sortOrder: number }[], userEmail: string): Promise<void>;
}

// ===== Mapper =====

export interface IRuleMapper {
  toDTO(doc: IRule | any): RuleDTO;
  toDTOList(docs: (IRule | any)[]): RuleDTO[];
}

// ===== Service =====

export interface IRuleService {
  getAll(userEmail: string, activeOnly?: boolean): Promise<RuleDTO[]>;
  create(input: RuleCreateInput, userEmail: string): Promise<RuleDTO>;
  update(id: string, input: RuleUpdateInput, userEmail: string): Promise<RuleDTO>;
  delete(id: string, userEmail: string): Promise<RuleDTO>;
  reorder(order: { id: string; sortOrder: number }[], userEmail: string): Promise<void>;
}
