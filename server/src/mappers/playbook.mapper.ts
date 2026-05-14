import type { IPlaybookMapper } from '../interfaces/playbook.interfaces.js';
import type { Playbook as PlaybookDTO } from '../types.js';

export class PlaybookMapper implements IPlaybookMapper {
  toDTO(doc: any): PlaybookDTO {
    return {
      id: doc._id,
      name: doc.name,
      description: doc.description || '',
      setupRules: doc.setupRules || [],
      entryCriteria: doc.entryCriteria || '',
      exitCriteria: doc.exitCriteria || '',
      riskRules: doc.riskRules || '',
      color: doc.color || '#58a6ff',
      isActive: doc.isActive,
      sortOrder: doc.sortOrder,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  toDTOList(docs: any[]): PlaybookDTO[] {
    return docs.map(doc => this.toDTO(doc));
  }
}
