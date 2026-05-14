import type { DateRangeFilter } from '../types.js';

// ===== Export Data Types =====

/** Aggregate analytics data to be formatted for export */
export interface AnalyticsExportData {
  overview: AnalyticsOverviewData;
  trades: TradeExportRow[];
  byDayOfWeek: DayOfWeekRow[];
  byInstrument: InstrumentRow[];
  bySide: SideRow[];
  byTag: TagRow[];
  byPlaybook: PlaybookRow[];
  byMood: MoodRow[];
  streaks: StreaksData;
  risk: RiskData;
  filter: DateRangeFilter;
  exportedAt: string;
}

export interface AnalyticsOverviewData {
  totalTrades: number;
  totalPnl: number;
  totalFees: number;
  winners: number;
  losers: number;
  breakeven: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  expectancy: number;
  sharpeRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  avgRR: number;
  tradingDays: number;
}

export interface TradeExportRow {
  date: string;
  instrument: string;
  side: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  pnl: number;
  fees: number;
  netPnl: number;
  tags: string;
  playbookId: string;
  rating: number;
  notes: string;
}

export interface DayOfWeekRow {
  day: string;
  dayIndex: number;
  trades: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}

export interface InstrumentRow {
  instrument: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}

export interface SideRow {
  side: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}

export interface TagRow {
  tag: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}

export interface PlaybookRow {
  playbookId: string;
  name: string;
  color: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}

export interface MoodRow {
  mood: string;
  days: number;
  totalPnl: number;
  avgPnlPerDay: number;
  totalTrades: number;
  winRate: number;
}

export interface StreaksData {
  currentStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
  heatmap: Array<{ date: string; pnl: number }>;
  compliance: Array<{ date: string; score: number }>;
}

export interface RiskData {
  tradesWithSL: number;
  tradesWithTP: number;
  avgRR: number;
  tpHitRate: number;
  slHitRate: number;
  rrData: Array<{
    date: string;
    instrument: string;
    side: string;
    riskPips: number;
    actualRR: number;
    plannedRR: number;
    pnl: number;
    hitTP: boolean;
    hitSL: boolean;
  }>;
  drawdownCurve: Array<{
    date: string;
    cumPnl: number;
    drawdown: number;
    peak: number;
  }>;
}

// ===== Export Result =====

export interface ExportResult {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

// ===== Contracts =====

/** Strategy interface for formatting export data into a specific file format (OCP) */
export interface IExportFormatter {
  /** Format analytics data into a downloadable buffer */
  format(data: AnalyticsExportData): Promise<Buffer>;

  /** MIME type for the output format */
  readonly mimeType: string;

  /** File extension (e.g. 'xlsx', 'csv') */
  readonly fileExtension: string;
}

/** Contract for the export orchestration service */
export interface IExportService {
  exportAnalytics(
    userEmail: string,
    filter: DateRangeFilter,
    format: string,
  ): Promise<ExportResult>;
}
