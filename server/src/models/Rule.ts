import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IRule {
  _id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
}

const RuleSchema = new Schema<IRule>({
  _id: { type: String, default: () => uuidv4() },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'general' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  userEmail: { type: String, required: true, index: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

export const Rule = mongoose.model<IRule>('Rule', RuleSchema);
