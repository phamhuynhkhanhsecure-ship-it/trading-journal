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
  driveFileId?: string;
}

export interface User {
  email: string;
  name: string;
  avatar: string;
  groupIds: string[];
  lastLoginAt: string;
  createdAt: string;
}

export interface ApiLine {
  action: string;
  path: string;
}

export interface Permission {
  permissionName: string;
  assignedMenuIds: string[];
  apiLines: ApiLine[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface Group {
  id: string;
  name: string;
  description: string;
  roleIds: string[];
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
  // New fields
  stopLoss: number;
  takeProfit: number;
  rating: number;
  disciplineScore: number;
  isMissedTrade: boolean;
  playbookId: string;
  reviewNotes: string;
  mistakes: string;
  lessons: string;
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
  stopLoss?: number;
  takeProfit?: number;
  rating?: number;
  playbookId?: string;
  reviewNotes?: string;
  mistakes?: string;
  lessons?: string;
  disciplineScore?: number;
  isMissedTrade?: boolean;
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

// Tags
export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  usageCount?: number;
}

// Journal
export type MoodType = 'frustrated' | 'anxious' | 'neutral' | 'confident' | 'in_the_zone';
export type MarketCondition = '' | 'trending' | 'ranging' | 'choppy' | 'high_volatility' | 'low_volatility';

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  mood: string;
  preMarketNotes: string;
  postMarketNotes: string;
  marketCondition: string;
  isChecklistDone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JournalCreateInput {
  date: string;
  content?: string;
  mood?: string;
  preMarketNotes?: string;
  postMarketNotes?: string;
  marketCondition?: string;
  isChecklistDone?: boolean;
}

// Playbooks
export interface Playbook {
  id: string;
  name: string;
  description: string;
  setupRules: string[];
  entryCriteria: string;
  exitCriteria: string;
  riskRules: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // Computed stats from API
  tradeCount?: number;
  winCount?: number;
  totalPnl?: number;
  avgPnl?: number;
  winRate?: number;
}

// Analytics types
export interface AnalyticsOverview {
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

export interface DayOfWeekData {
  day: string;
  dayIndex: number;
  trades: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}

export interface InstrumentData {
  instrument: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}

export interface SideData {
  side: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}

export interface TagPerformance {
  tag: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}

export interface PlaybookPerformance {
  playbookId: string;
  name: string;
  color: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}

export interface MoodPerformance {
  mood: string;
  days: number;
  totalPnl: number;
  avgPnlPerDay: number;
  totalTrades: number;
  winRate: number;
}

export interface HeatmapDay {
  date: string;
  pnl: number;
}

export interface StreakData {
  currentStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
  heatmap: HeatmapDay[];
  compliance: { date: string; score: number }[];
}

export interface RollingData {
  date: string;
  dayPnl: number;
  rollingAvg: number;
  rollingTotal: number;
  windowSize: number;
}

export interface RiskData {
  tradesWithSL: number;
  tradesWithTP: number;
  avgRR: number;
  tpHitRate: number;
  slHitRate: number;
  rrData: {
    date: string;
    instrument: string;
    side: string;
    riskPips: number;
    actualRR: number;
    plannedRR: number;
    pnl: number;
    hitTP: boolean;
    hitSL: boolean;
  }[];
  drawdownCurve: {
    date: string;
    cumPnl: number;
    drawdown: number;
    peak: number;
  }[];
}

// Filter types
export interface TradeFilters {
  instrument?: string;
  side?: string;
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
  pnlMin?: string;
  pnlMax?: string;
  search?: string;
  playbookId?: string;
  rating?: string;
}

export const MOOD_OPTIONS: { value: MoodType; emoji: string; label: string }[] = [
  { value: 'frustrated', emoji: '😤', label: 'Bực bội' },
  { value: 'anxious', emoji: '😰', label: 'Lo lắng' },
  { value: 'neutral', emoji: '😐', label: 'Bình thường' },
  { value: 'confident', emoji: '😊', label: 'Tự tin' },
  { value: 'in_the_zone', emoji: '🔥', label: 'Cực kỳ tập trung' },
];

export const MARKET_CONDITIONS: { value: MarketCondition; label: string }[] = [
  { value: '', label: 'Chưa đặt' },
  { value: 'trending', label: '📈 Xu hướng' },
  { value: 'ranging', label: '↔️ Sideway' },
  { value: 'choppy', label: '🌊 Nhiễu' },
  { value: 'high_volatility', label: '⚡ Biến động cao' },
  { value: 'low_volatility', label: '😴 Biến động thấp' },
];

export const TAG_COLORS = [
  '#58a6ff', '#3fb950', '#f85149', '#d29922',
  '#bc8cff', '#f778ba', '#79c0ff', '#56d364',
];
