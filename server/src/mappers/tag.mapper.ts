import type { ITagMapper } from '../interfaces/tag.interfaces.js';
import type { Tag as TagDTO } from '../types.js';

export class TagMapper implements ITagMapper {
  toDTO(doc: any): TagDTO {
    return {
      id: doc._id,
      name: doc.name,
      color: doc.color || '#58a6ff',
      createdAt: doc.createdAt,
    };
  }

  toDTOList(docs: any[]): TagDTO[] {
    return docs.map(doc => this.toDTO(doc));
  }
}
