import type { ITag } from '../models/Tag.js';
import type { Tag as TagDTO, TagCreateInput, TagUpdateInput, TagWithUsage } from '../types.js';

// ===== Repository =====

export interface ITagRepository {
  findAll(userEmail: string): Promise<ITag[]>;
  findById(id: string, userEmail: string): Promise<ITag | null>;
  findDuplicate(name: string, userEmail: string): Promise<ITag | null>;
  create(data: Partial<ITag>): Promise<ITag>;
  update(id: string, userEmail: string, data: Partial<ITag>): Promise<ITag | null>;
  delete(id: string, userEmail: string): Promise<ITag | null>;
}

// ===== Mapper =====

export interface ITagMapper {
  toDTO(doc: ITag | any): TagDTO;
  toDTOList(docs: (ITag | any)[]): TagDTO[];
}

// ===== Service =====

export interface ITagService {
  getAll(userEmail: string): Promise<TagWithUsage[]>;
  getSuggestions(userEmail: string): Promise<string[]>;
  create(input: TagCreateInput, userEmail: string): Promise<TagDTO>;
  update(id: string, input: TagUpdateInput, userEmail: string): Promise<TagDTO>;
  delete(id: string, userEmail: string): Promise<TagDTO>;
}
