import type {
  IExportService,
  IExportFormatter,
  AnalyticsExportData,
  ExportResult,
  TradeExportRow,
} from '../interfaces/export.interfaces.js';
import type { IAnalyticsService } from '../interfaces/analytics.interfaces.js';
import type { ITradeRepository } from '../interfaces/trade.interfaces.js';
import type { DateRangeFilter } from '../types.js';

/**
 * Export service — orchestrates data gathering from multiple sources
 * and delegates formatting to the injected IExportFormatter (DIP).
 *
 * SRP: ONLY responsible for collecting analytics data + calling formatter.
 * Does NOT contain Excel logic or HTTP concerns.
 */
export class ExportService implements IExportService {
  constructor(
    private readonly analyticsService: IAnalyticsService,
    private readonly tradeRepo: ITradeRepository,
    private readonly formatter: IExportFormatter,
  ) {}

  async exportAnalytics(
    userEmail: string,
    filter: DateRangeFilter,
    _format: string, // reserved for future multi-format support
  ): Promise<ExportResult> {
    const data = await this.gatherData(userEmail, filter);
    const buffer = await this.formatter.format(data);

    const dateSuffix = this.buildDateSuffix(filter);
    const filename = `trading-journal-analytics${dateSuffix}.${this.formatter.fileExtension}`;

    return {
      buffer,
      mimeType: this.formatter.mimeType,
      filename,
    };
  }

  /**
   * Gather all analytics data in parallel for maximum performance.
   * Pure data aggregation — no formatting logic.
   */
  private async gatherData(
    userEmail: string,
    filter: DateRangeFilter,
  ): Promise<AnalyticsExportData> {
    const [overview, byDayOfWeek, byInstrument, bySide, byTag, byPlaybook, byMood, streaks, risk, rawTrades] =
      await Promise.all([
        this.analyticsService.getOverview(userEmail, filter),
        this.analyticsService.getByDayOfWeek(userEmail, filter),
        this.analyticsService.getByInstrument(userEmail, filter),
        this.analyticsService.getBySide(userEmail, filter),
        this.analyticsService.getByTag(userEmail, filter),
        this.analyticsService.getByPlaybook(userEmail, filter),
        this.analyticsService.getByMood(userEmail, filter),
        this.analyticsService.getStreaks(userEmail, filter),
        this.analyticsService.getRisk(userEmail, filter),
        this.fetchTrades(userEmail, filter),
      ]);

    return {
      overview,
      trades: rawTrades,
      byDayOfWeek,
      byInstrument,
      bySide,
      byTag,
      byPlaybook,
      byMood,
      streaks,
      risk,
      filter,
      exportedAt: new Date().toISOString(),
    };
  }

  /** Fetch raw trades and map to export rows */
  private async fetchTrades(
    userEmail: string,
    filter: DateRangeFilter,
  ): Promise<TradeExportRow[]> {
    const mongoFilter: Record<string, any> = { userEmail };
    if (filter.dateFrom || filter.dateTo) {
      mongoFilter.date = {};
      if (filter.dateFrom) mongoFilter.date.$gte = filter.dateFrom;
      if (filter.dateTo) mongoFilter.date.$lte = filter.dateTo;
    }

    const trades = await this.tradeRepo.findAll(mongoFilter);

    return trades.map((t) => ({
      date: t.date,
      instrument: t.instrument,
      side: t.side,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      quantity: t.quantity,
      stopLoss: t.stopLoss,
      takeProfit: t.takeProfit,
      pnl: t.pnl,
      fees: t.fees,
      netPnl: t.pnl - (t.fees || 0),
      tags: (t.tags || []).join(', '),
      playbookId: t.playbookId || '',
      rating: t.rating || 0,
      notes: t.notes || '',
    }));
  }

  private buildDateSuffix(filter: DateRangeFilter): string {
    if (filter.dateFrom && filter.dateTo) return `_${filter.dateFrom}_to_${filter.dateTo}`;
    if (filter.dateFrom) return `_from_${filter.dateFrom}`;
    if (filter.dateTo) return `_until_${filter.dateTo}`;
    return '_all-time';
  }
}
