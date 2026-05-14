import { Tag, ITag } from '../models/Tag.js';
import type { ITagRepository } from '../interfaces/tag.interfaces.js';

export class TagRepository implements ITagRepository {
  async findAll(userEmail: string): Promise<ITag[]> {
    return Tag.find({ userEmail }).sort({ name: 1 }).lean();
  }

  async findById(id: string, userEmail: string): Promise<ITag | null> {
    return Tag.findOne({ _id: id, userEmail }).lean();
  }

  async findDuplicate(name: string, userEmail: string): Promise<ITag | null> {
    return Tag.findOne({
      userEmail,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    }).lean();
  }

  async create(data: Partial<ITag>): Promise<ITag> {
    const tag = new Tag(data);
    await tag.save();
    return tag.toObject();
  }

  async update(id: string, userEmail: string, data: Partial<ITag>): Promise<ITag | null> {
    return Tag.findOneAndUpdate(
      { _id: id, userEmail },
      { $set: data },
      { new: true },
    ).lean();
  }

  async delete(id: string, userEmail: string): Promise<ITag | null> {
    return Tag.findOneAndDelete({ _id: id, userEmail }).lean();
  }
}
