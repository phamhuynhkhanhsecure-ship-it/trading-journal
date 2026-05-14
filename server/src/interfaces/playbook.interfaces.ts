import type { IPlaybook } from '../models/Playbook.js';
import type { Playbook as PlaybookDTO, PlaybookCreateInput, PlaybookUpdateInput, PlaybookWithStats } from '../types.js';

// ===== Repository =====

export interface IPlaybookRepository {
  findAll(userEmail: string): Promise<IPlaybook[]>;
  findById(id: string, userEmail: string): Promise<IPlaybook | null>;
  findMaxSortOrder(userEmail: string): Promise<number>;
  create(data: Partial<IPlaybook>): Promise<IPlaybook>;
  update(id: string, userEmail: string, data: Partial<IPlaybook>): Promise<IPlaybook | null>;
  delete(id: string, userEmail: string): Promise<IPlaybook | null>;
  clearPlaybookFromTrades(playbookId: string, userEmail: string): Promise<void>;
}

// ===== Mapper =====

export interface IPlaybookMapper {
  toDTO(doc: IPlaybook | any): PlaybookDTO;
  toDTOList(docs: (IPlaybook | any)[]): PlaybookDTO[];
}

// ===== Service =====

export interface IPlaybookService {
  getAll(userEmail: string): Promise<PlaybookWithStats[]>;
  getById(id: string, userEmail: string): Promise<PlaybookWithStats>;
  create(input: PlaybookCreateInput, userEmail: string): Promise<PlaybookWithStats>;
  update(id: string, input: PlaybookUpdateInput, userEmail: string): Promise<PlaybookWithStats>;
  delete(id: string, userEmail: string): Promise<PlaybookDTO>;
}
