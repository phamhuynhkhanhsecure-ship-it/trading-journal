import type { IJournalEntry } from '../models/JournalEntry.js';
import type { JournalEntry as JournalDTO, JournalCreateInput, JournalUpdateInput } from '../types.js';

// ===== Repository =====

export interface IJournalRepository {
  findAll(filter: Record<string, any>, sort: Record<string, 1 | -1>): Promise<IJournalEntry[]>;
  findByDate(date: string, userEmail: string): Promise<IJournalEntry | null>;
  findMutableByDate(date: string, userEmail: string): Promise<any>;
  create(data: Partial<IJournalEntry>): Promise<IJournalEntry>;
  updateById(id: string, data: Partial<IJournalEntry>): Promise<IJournalEntry | null>;
  deleteById(id: string): Promise<IJournalEntry | null>;
}

// ===== Mapper =====

export interface IJournalMapper {
  toDTO(doc: IJournalEntry | any): JournalDTO;
  toDTOList(docs: (IJournalEntry | any)[]): JournalDTO[];
}

// ===== Service =====

export interface IJournalService {
  getAll(userEmail: string, year?: number, month?: number): Promise<JournalDTO[]>;
  getByDate(date: string, userEmail: string): Promise<JournalDTO | null>;
  upsert(input: JournalCreateInput, userEmail: string): Promise<JournalDTO>;
  update(date: string, input: JournalUpdateInput, userEmail: string): Promise<JournalDTO>;
  delete(date: string, userEmail: string): Promise<JournalDTO>;
}
