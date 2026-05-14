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

export interface Trade {
  id: string;
  date: string; // YYYY-MM-DD
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
  rating: number; // 0-5 stars
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

export interface RuleCreateInput {
  name: string;
  description?: string;
  category?: string;
}

export interface RuleUpdateInput extends Partial<RuleCreateInput> {
  isActive?: boolean;
  sortOrder?: number;
}

// Tags
export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface TagCreateInput {
  name: string;
  color?: string;
}

export interface TagUpdateInput {
  name?: string;
  color?: string;
}

// Journal
export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  mood: string;
  preMarketNotes: string;
  postMarketNotes: string;
  marketCondition: string;
  isChecklistDone?: boolean;
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
}

export interface JournalUpdateInput extends Partial<Omit<JournalCreateInput, 'date'>> {}

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
}

export interface PlaybookCreateInput {
  name: string;
  description?: string;
  setupRules?: string[];
  entryCriteria?: string;
  exitCriteria?: string;
  riskRules?: string;
  color?: string;
}

export interface PlaybookUpdateInput extends Partial<PlaybookCreateInput> {
  isActive?: boolean;
  sortOrder?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===== Filter types =====

export interface TradeFilter {
  year?: number;
  month?: number;
  instrument?: string;
  side?: 'LONG' | 'SHORT';
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
  pnlMin?: number;
  pnlMax?: number;
  search?: string;
  playbookId?: string;
  rating?: number;
}

export interface DateRangeFilter {
  dateFrom?: string;
  dateTo?: string;
}

// ===== Gallery =====

export interface GalleryItem {
  id: string;
  tradeId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  caption: string;
  sortOrder: number;
  createdAt: string;
  driveFileId: string;
  tradeDate: string;
  instrument: string;
  side: string;
  pnl: number;
}

// ===== Playbook with stats =====

export interface PlaybookWithStats extends Playbook {
  tradeCount: number;
  winCount: number;
  totalPnl: number;
  avgPnl: number;
  winRate: number;
}

// ===== Tag with usage =====

export interface TagWithUsage extends Tag {
  usageCount: number;
}
