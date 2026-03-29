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

export interface RuleCreateInput {
  name: string;
  description?: string;
  category?: string;
}

export interface RuleUpdateInput extends Partial<RuleCreateInput> {
  isActive?: boolean;
  sortOrder?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
