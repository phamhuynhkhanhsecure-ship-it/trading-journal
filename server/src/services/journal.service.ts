import { v4 as uuidv4 } from 'uuid';
import type { IJournalService, IJournalRepository, IJournalMapper } from '../interfaces/journal.interfaces.js';
import type { JournalEntry as JournalDTO, JournalCreateInput, JournalUpdateInput } from '../types.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { ValidationError } from '../errors/ValidationError.js';

export class JournalService implements IJournalService {
  constructor(
    private readonly journalRepo: IJournalRepository,
    private readonly mapper: IJournalMapper,
  ) {}

  async getAll(userEmail: string, year?: number, month?: number): Promise<JournalDTO[]> {
    const filter: Record<string, any> = { userEmail };
    let sort: Record<string, 1 | -1> = { date: -1 };

    if (year && month) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      filter.date = { $regex: `^${prefix}` };
      sort = { date: 1 };
    }

    const docs = await this.journalRepo.findAll(filter, sort);
    return this.mapper.toDTOList(docs);
  }

  async getByDate(date: string, userEmail: string): Promise<JournalDTO | null> {
    const doc = await this.journalRepo.findByDate(date, userEmail);
    return doc ? this.mapper.toDTO(doc) : null;
  }

  async upsert(input: JournalCreateInput, userEmail: string): Promise<JournalDTO> {
    if (!input.date) throw new ValidationError('Date is required');

    const now = new Date().toISOString();
    const existing = await this.journalRepo.findByDate(input.date, userEmail);

    if (existing) {
      // Update
      const updateData: Record<string, any> = { updatedAt: now };
      if (input.content !== undefined) updateData.content = input.content;
      if (input.mood !== undefined) updateData.mood = input.mood;
      if (input.preMarketNotes !== undefined) updateData.preMarketNotes = input.preMarketNotes;
      if (input.postMarketNotes !== undefined) updateData.postMarketNotes = input.postMarketNotes;
      if (input.marketCondition !== undefined) updateData.marketCondition = input.marketCondition;
      if ((input as any).isChecklistDone !== undefined) updateData.isChecklistDone = (input as any).isChecklistDone;

      await this.journalRepo.updateById(existing._id, updateData);
    } else {
      // Create
      await this.journalRepo.create({
        _id: uuidv4(),
        userEmail,
        date: input.date,
        content: input.content || '',
        mood: input.mood || 'neutral',
        preMarketNotes: input.preMarketNotes || '',
        postMarketNotes: input.postMarketNotes || '',
        marketCondition: input.marketCondition || '',
        isChecklistDone: (input as any).isChecklistDone || false,
        createdAt: now,
        updatedAt: now,
      } as any);
    }

    const doc = await this.journalRepo.findByDate(input.date, userEmail);
    return this.mapper.toDTO(doc);
  }

  async update(date: string, input: JournalUpdateInput, userEmail: string): Promise<JournalDTO> {
    const existing = await this.journalRepo.findByDate(date, userEmail);
    if (!existing) throw new NotFoundError('Journal entry');

    const now = new Date().toISOString();
    const updateData: Record<string, any> = { updatedAt: now };
    if (input.content !== undefined) updateData.content = input.content;
    if (input.mood !== undefined) updateData.mood = input.mood;
    if (input.preMarketNotes !== undefined) updateData.preMarketNotes = input.preMarketNotes;
    if (input.postMarketNotes !== undefined) updateData.postMarketNotes = input.postMarketNotes;
    if (input.marketCondition !== undefined) updateData.marketCondition = input.marketCondition;
    if ((input as any).isChecklistDone !== undefined) updateData.isChecklistDone = (input as any).isChecklistDone;

    const updated = await this.journalRepo.updateById(existing._id, updateData);
    return this.mapper.toDTO(updated);
  }

  async delete(date: string, userEmail: string): Promise<JournalDTO> {
    const existing = await this.journalRepo.findByDate(date, userEmail);
    if (!existing) throw new NotFoundError('Journal entry');
    await this.journalRepo.deleteById(existing._id);
    return this.mapper.toDTO(existing);
  }
}
