import type { Request, Response } from 'express';
import type { IPlaybookService } from '../interfaces/playbook.interfaces.js';

export class PlaybookController {
  constructor(private readonly playbookService: IPlaybookService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.playbookService.getAll(userEmail);
    res.json({ success: true, data });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.playbookService.getById(req.params.id as string, userEmail);
    res.json({ success: true, data });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.playbookService.create(req.body, userEmail);
    res.status(201).json({ success: true, data });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.playbookService.update(req.params.id as string, req.body, userEmail);
    res.json({ success: true, data });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.playbookService.delete(req.params.id as string, userEmail);
    res.json({ success: true, data });
  };
}
