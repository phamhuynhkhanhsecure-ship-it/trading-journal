import type { Request, Response } from 'express';
import type { IExportService } from '../interfaces/export.interfaces.js';
import type { DateRangeFilter } from '../types.js';

/**
 * Export controller — handles HTTP concerns for export endpoints.
 * SRP: ONLY parses request → calls service → sends binary response.
 */
export class ExportController {
  constructor(private readonly exportService: IExportService) {}

  /** GET /api/analytics/export?dateFrom=...&dateTo=...&format=xlsx */
  exportAnalytics = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const filter: DateRangeFilter = {
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    };
    const format = (req.query.format as string) || 'xlsx';

    const result = await this.exportService.exportAnalytics(userEmail, filter, format);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
  };
}
