import type { Request, Response } from 'express';
import type { IJournalService } from '../interfaces/journal.interfaces.js';

export class JournalController {
  constructor(private readonly journalService: IJournalService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const data = await this.journalService.getAll(userEmail, year, month);
    res.json({ success: true, data });
  };

  getByDate = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.journalService.getByDate(req.params.date as string, userEmail);
    res.json({ success: true, data });
  };

  upsert = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.journalService.upsert(req.body, userEmail);
    res.status(201).json({ success: true, data });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.journalService.update(req.params.date as string, req.body, userEmail);
    res.json({ success: true, data });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.journalService.delete(req.params.date as string, userEmail);
    res.json({ success: true, data });
  };
}
