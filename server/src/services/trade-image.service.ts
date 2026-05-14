import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import type { ITradeImageService, ITradeRepository, ITradeMapper } from '../interfaces/trade.interfaces.js';
import type { IStorageProvider } from '../interfaces/storage.interfaces.js';
import type { TradeImage, GalleryItem } from '../types.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { ValidationError } from '../errors/ValidationError.js';
import { ITradeImage } from '../models/Trade.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'data', 'uploads');

/**
 * Trade image service — ISP: separated from ITradeService.
 * Uses IStorageProvider (DIP) — works with Drive, Local, or any future provider.
 */
export class TradeImageService implements ITradeImageService {
  constructor(
    private readonly tradeRepo: ITradeRepository,
    private readonly mapper: ITradeMapper,
    private readonly storage: IStorageProvider,
  ) {}

  async uploadImages(
    tradeId: string,
    files: Express.Multer.File[],
    userEmail: string,
  ): Promise<TradeImage[]> {
    const trade = await this.tradeRepo.findMutable(tradeId, userEmail);
    if (!trade) throw new NotFoundError('Trade');

    if (!files || files.length === 0) {
      throw new ValidationError('No files uploaded');
    }

    const existingCount = trade.images.length;
    if (existingCount + files.length > 10) {
      throw new ValidationError(
        `Maximum 10 images per trade. Currently ${existingCount}, tried to add ${files.length}.`,
      );
    }

    const now = new Date().toISOString();
    const newImages: ITradeImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = path.extname(f.originalname);
      const uniqueName = `${uuidv4()}${ext}`;
      const driveFileId = await this.storage.upload(f.buffer, uniqueName, f.mimetype);

      newImages.push({
        id: uuidv4(),
        filename: uniqueName,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        caption: '',
        sortOrder: existingCount + i,
        createdAt: now,
        driveFileId,
      });
    }

    trade.images.push(...newImages);
    await trade.save();

    return trade.images.map((img: any) => ({
      id: img.id,
      tradeId: trade._id,
      filename: img.filename,
      originalName: img.originalName,
      mimeType: img.mimeType,
      size: img.size,
      caption: img.caption || '',
      sortOrder: img.sortOrder,
      createdAt: img.createdAt,
      driveFileId: img.driveFileId || '',
    }));
  }

  async deleteImage(
    tradeId: string,
    imageId: string,
    userEmail: string,
  ): Promise<{ id: string }> {
    const trade = await this.tradeRepo.findMutable(tradeId, userEmail);
    if (!trade) throw new NotFoundError('Trade');

    const imgIndex = trade.images.findIndex((img: any) => img.id === imageId);
    if (imgIndex === -1) throw new NotFoundError('Image');

    const img = trade.images[imgIndex];
    if (img.driveFileId) {
      try { await this.storage.delete(img.driveFileId); } catch (e) { console.error('Storage delete error:', e); }
    } else {
      // Legacy local file cleanup
      const filePath = path.join(UPLOADS_DIR, img.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    trade.images.splice(imgIndex, 1);
    await trade.save();

    return { id: imageId };
  }

  async getGallery(userEmail: string): Promise<GalleryItem[]> {
    const trades = await this.tradeRepo.findWithImages(userEmail);
    const items: GalleryItem[] = [];
    for (const t of trades) {
      for (const img of (t as any).images || []) {
        items.push(this.mapper.toGalleryItem(t, img));
      }
    }
    return items;
  }
}
