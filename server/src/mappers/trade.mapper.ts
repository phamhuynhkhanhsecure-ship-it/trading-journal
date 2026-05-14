import type { ITradeMapper } from '../interfaces/trade.interfaces.js';
import type { Trade as TradeDTO, GalleryItem } from '../types.js';

export class TradeMapper implements ITradeMapper {
  toDTO(doc: any): TradeDTO {
    return {
      id: doc._id,
      date: doc.date,
      instrument: doc.instrument,
      side: doc.side,
      entryPrice: doc.entryPrice || 0,
      exitPrice: doc.exitPrice || 0,
      quantity: doc.quantity || 0,
      pnl: doc.pnl || 0,
      fees: doc.fees || 0,
      notes: doc.notes || '',
      tags: doc.tags || [],
      images: (doc.images || []).map((img: any) => ({
        id: img.id,
        tradeId: doc._id,
        filename: img.filename,
        originalName: img.originalName,
        mimeType: img.mimeType,
        size: img.size,
        caption: img.caption || '',
        sortOrder: img.sortOrder || 0,
        createdAt: img.createdAt,
        driveFileId: img.driveFileId || '',
      })),
      ruleChecklist: (doc.ruleChecklist || []).map((r: any) => ({
        ruleId: r.ruleId,
        ruleName: r.ruleName,
        followed: r.followed,
      })),
      stopLoss: doc.stopLoss || 0,
      takeProfit: doc.takeProfit || 0,
      rating: doc.rating || 0,
      playbookId: doc.playbookId || '',
      reviewNotes: doc.reviewNotes || '',
      mistakes: doc.mistakes || '',
      lessons: doc.lessons || '',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  toDTOList(docs: any[]): TradeDTO[] {
    return docs.map(doc => this.toDTO(doc));
  }

  toGalleryItem(trade: any, image: any): GalleryItem {
    return {
      id: image.id,
      tradeId: trade._id,
      filename: image.filename,
      originalName: image.originalName,
      mimeType: image.mimeType,
      size: image.size,
      caption: image.caption || '',
      sortOrder: image.sortOrder,
      createdAt: image.createdAt,
      driveFileId: image.driveFileId || '',
      tradeDate: trade.date,
      instrument: trade.instrument,
      side: trade.side,
      pnl: trade.pnl,
    };
  }
}
