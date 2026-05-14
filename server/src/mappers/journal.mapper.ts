import type { IJournalMapper } from '../interfaces/journal.interfaces.js';
import type { JournalEntry as JournalDTO } from '../types.js';

export class JournalMapper implements IJournalMapper {
  toDTO(doc: any): JournalDTO {
    return {
      id: doc._id,
      date: doc.date,
      content: doc.content || '',
      mood: doc.mood || 'neutral',
      preMarketNotes: doc.preMarketNotes || '',
      postMarketNotes: doc.postMarketNotes || '',
      marketCondition: doc.marketCondition || '',
      isChecklistDone: doc.isChecklistDone || false,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  toDTOList(docs: any[]): JournalDTO[] {
    return docs.map(doc => this.toDTO(doc));
  }
}
