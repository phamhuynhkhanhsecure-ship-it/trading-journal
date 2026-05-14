import type { Request, Response } from 'express';
import type { IRuleService } from '../interfaces/rule.interfaces.js';

export class RuleController {
  constructor(private readonly ruleService: IRuleService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const activeOnly = req.query.active === 'true';
    const data = await this.ruleService.getAll(userEmail, activeOnly);
    res.json({ success: true, data });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.ruleService.create(req.body, userEmail);
    res.status(201).json({ success: true, data });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.ruleService.update(req.params.id as string, req.body, userEmail);
    res.json({ success: true, data });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.ruleService.delete(req.params.id as string, userEmail);
    res.json({ success: true, data });
  };

  reorder = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    await this.ruleService.reorder(req.body.order, userEmail);
    res.json({ success: true, data: null });
  };
}
