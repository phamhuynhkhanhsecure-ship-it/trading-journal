import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IPlaybook {
  _id: string;
  name: string;
  description: string;
  setupRules: string[];
  entryCriteria: string;
  exitCriteria: string;
  riskRules: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
}

const PlaybookSchema = new Schema<IPlaybook>({
  _id: { type: String, default: () => uuidv4() },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  setupRules: { type: [String], default: [] },
  entryCriteria: { type: String, default: '' },
  exitCriteria: { type: String, default: '' },
  riskRules: { type: String, default: '' },
  color: { type: String, default: '#58a6ff' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  userEmail: { type: String, required: true, index: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

export const Playbook = mongoose.model<IPlaybook>('Playbook', PlaybookSchema);
