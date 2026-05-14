import type { IRuleMapper } from '../interfaces/rule.interfaces.js';
import type { Rule as RuleDTO } from '../types.js';

export class RuleMapper implements IRuleMapper {
  toDTO(doc: any): RuleDTO {
    return {
      id: doc._id,
      name: doc.name,
      description: doc.description || '',
      category: doc.category || 'general',
      isActive: doc.isActive,
      sortOrder: doc.sortOrder,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  toDTOList(docs: any[]): RuleDTO[] {
    return docs.map(doc => this.toDTO(doc));
  }
}
