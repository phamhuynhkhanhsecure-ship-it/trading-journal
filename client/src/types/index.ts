export interface TradeImage {
  id: string;
  tradeId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  caption: string;
  sortOrder: number;
  createdAt: string;
}

export interface GalleryImage extends TradeImage {
  tradeDate: string;
  instrument: string;
  side: 'LONG' | 'SHORT';
  pnl: number;
}

export interface Trade {
  id: string;
  date: string;
  instrument: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  fees: number;
  notes: string;
  tags: string[];
  images: TradeImage[];
  ruleChecklist: TradeRuleEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface TradeRuleEntry {
  ruleId: string;
  ruleName: string;
  followed: boolean;
}

export interface TradeCreateInput {
  date: string;
  instrument: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  fees: number;
  notes?: string;
  tags?: string[];
  ruleChecklist?: { ruleId: string; followed: boolean }[];
}

export interface TradeUpdateInput extends Partial<TradeCreateInput> {}

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DayData {
  date: string;
  trades: Trade[];
  totalPnl: number;
  tradeCount: number;
}

export interface WeekSummary {
  weekNumber: number;
  totalPnl: number;
  totalTrades: number;
}

export interface MonthData {
  year: number;
  month: number;
  trades: Trade[];
  totalPnl: number;
  totalTrades: number;
  winningDays: number;
  losingDays: number;
  dayDataMap: Record<string, DayData>;
  weekSummaries: WeekSummary[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ThemeMode = 'dark' | 'light';
