import type { Request, Response } from 'express';
import type { IAnalyticsService } from '../interfaces/analytics.interfaces.js';
import type { DateRangeFilter } from '../types.js';

export class AnalyticsController {
  constructor(private readonly analyticsService: IAnalyticsService) {}

  private getFilter(req: Request): DateRangeFilter {
    return {
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    };
  }

  overview = async (req: Request, res: Response): Promise<void> => {
    const data = await this.analyticsService.getOverview((req as any).user.email, this.getFilter(req));
    res.json({ success: true, data });
  };

  byDayOfWeek = async (req: Request, res: Response): Promise<void> => {
    const data = await this.analyticsService.getByDayOfWeek((req as any).user.email, this.getFilter(req));
    res.json({ success: true, data });
  };

  byInstrument = async (req: Request, res: Response): Promise<void> => {
    const data = await this.analyticsService.getByInstrument((req as any).user.email, this.getFilter(req));
    res.json({ success: true, data });
  };

  bySide = async (req: Request, res: Response): Promise<void> => {
    const data = await this.analyticsService.getBySide((req as any).user.email, this.getFilter(req));
    res.json({ success: true, data });
  };

  byTag = async (req: Request, res: Response): Promise<void> => {
    const data = await this.analyticsService.getByTag((req as any).user.email, this.getFilter(req));
    res.json({ success: true, data });
  };

  byPlaybook = async (req: Request, res: Response): Promise<void> => {
    const data = await this.analyticsService.getByPlaybook((req as any).user.email, this.getFilter(req));
    res.json({ success: true, data });
  };

  streaks = async (req: Request, res: Response): Promise<void> => {
    const data = await this.analyticsService.getStreaks((req as any).user.email, this.getFilter(req));
    res.json({ success: true, data });
  };

  risk = async (req: Request, res: Response): Promise<void> => {
    const data = await this.analyticsService.getRisk((req as any).user.email, this.getFilter(req));
    res.json({ success: true, data });
  };

  byMood = async (req: Request, res: Response): Promise<void> => {
    const data = await this.analyticsService.getByMood((req as any).user.email, this.getFilter(req));
    res.json({ success: true, data });
  };

  rolling = async (req: Request, res: Response): Promise<void> => {
    const window = parseInt(req.query.window as string) || 30;
    const data = await this.analyticsService.getRolling((req as any).user.email, window);
    res.json({ success: true, data });
  };
}
