import type { Request, Response } from 'express';
import type { ITagService } from '../interfaces/tag.interfaces.js';

export class TagController {
  constructor(private readonly tagService: ITagService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.tagService.getAll(userEmail);
    res.json({ success: true, data });
  };

  getSuggestions = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.tagService.getSuggestions(userEmail);
    res.json({ success: true, data });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.tagService.create(req.body, userEmail);
    res.status(201).json({ success: true, data });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.tagService.update(req.params.id as string, req.body, userEmail);
    res.json({ success: true, data });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.tagService.delete(req.params.id as string, userEmail);
    res.json({ success: true, data });
  };
}
