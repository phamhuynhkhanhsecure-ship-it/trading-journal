import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITag {
  _id: string;
  name: string;
  color: string;
  userEmail: string;
  createdAt: string;
}

const TagSchema = new Schema<ITag>({
  _id: { type: String, default: () => uuidv4() },
  name: { type: String, required: true },
  color: { type: String, default: '#58a6ff' },
  userEmail: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

TagSchema.index({ name: 1, userEmail: 1 }, { unique: true });

export const Tag = mongoose.model<ITag>('Tag', TagSchema);
