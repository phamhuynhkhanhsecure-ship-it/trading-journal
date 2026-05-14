import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITradeImage {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  caption: string;
  sortOrder: number;
  createdAt: string;
  driveFileId?: string;
}

export interface ITradeRuleEntry {
  ruleId: string;
  ruleName: string;
  followed: boolean;
}

export interface ITrade {
  _id: string;
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
  images: ITradeImage[];
  ruleChecklist: ITradeRuleEntry[];
  stopLoss: number;
  takeProfit: number;
  rating: number;
  disciplineScore: number;
  isMissedTrade: boolean;
  playbookId: string;
  reviewNotes: string;
  mistakes: string;
  lessons: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
}

const TradeImageSchema = new Schema<ITradeImage>({
  id: { type: String, default: () => uuidv4() },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  caption: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toISOString() },
  driveFileId: { type: String, default: '' },
}, { _id: false });

const TradeRuleEntrySchema = new Schema<ITradeRuleEntry>({
  ruleId: { type: String, required: true },
  ruleName: { type: String, required: true },
  followed: { type: Boolean, required: true },
}, { _id: false });

const TradeSchema = new Schema<ITrade>({
  _id: { type: String, default: () => uuidv4() },
  date: { type: String, required: true, index: true },
  instrument: { type: String, required: true },
  side: { type: String, enum: ['LONG', 'SHORT'], required: true },
  entryPrice: { type: Number, default: 0 },
  exitPrice: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  pnl: { type: Number, default: 0 },
  fees: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  tags: { type: [String], default: [] },
  images: { type: [TradeImageSchema], default: [] },
  ruleChecklist: { type: [TradeRuleEntrySchema], default: [] },
  stopLoss: { type: Number, default: 0 },
  takeProfit: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  disciplineScore: { type: Number, default: 0 },
  isMissedTrade: { type: Boolean, default: false },
  playbookId: { type: String, default: '' },
  reviewNotes: { type: String, default: '' },
  mistakes: { type: String, default: '' },
  lessons: { type: String, default: '' },
  userEmail: { type: String, required: true, index: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

export const Trade = mongoose.model<ITrade>('Trade', TradeSchema);
