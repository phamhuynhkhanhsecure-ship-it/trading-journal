import type { ITrade } from '../models/Trade.js';
import type {
  Trade as TradeDTO,
  TradeCreateInput,
  TradeUpdateInput,
  TradeFilter,
  TradeImage,
  GalleryItem,
} from '../types.js';

// ===== Repository =====

export interface ITradeRepository {
  findAll(filter: Record<string, any>): Promise<ITrade[]>;
  findById(id: string, userEmail: string): Promise<ITrade | null>;
  create(data: Partial<ITrade>): Promise<ITrade>;
  update(id: string, userEmail: string, data: Partial<ITrade>): Promise<ITrade | null>;
  delete(id: string, userEmail: string): Promise<ITrade | null>;
  findMutable(id: string, userEmail: string): Promise<any>; // Mongoose document (not lean)
  findWithImages(userEmail: string): Promise<ITrade[]>;
  insertMany(docs: Partial<ITrade>[]): Promise<ITrade[]>;
  aggregate(pipeline: any[]): Promise<any[]>;
}

// ===== Mapper =====

export interface ITradeMapper {
  toDTO(doc: ITrade | any): TradeDTO;
  toDTOList(docs: (ITrade | any)[]): TradeDTO[];
  toGalleryItem(trade: any, image: any): GalleryItem;
}

// ===== Services =====

export interface ITradeService {
  getAll(filter: TradeFilter, userEmail: string): Promise<TradeDTO[]>;
  getById(id: string, userEmail: string): Promise<TradeDTO>;
  create(input: TradeCreateInput, userEmail: string): Promise<TradeDTO>;
  update(id: string, input: TradeUpdateInput, userEmail: string): Promise<TradeDTO>;
  delete(id: string, userEmail: string): Promise<TradeDTO>;
  bulkCreate(trades: TradeCreateInput[], userEmail: string): Promise<TradeDTO[]>;
}

export interface ITradeImageService {
  uploadImages(tradeId: string, files: Express.Multer.File[], userEmail: string): Promise<TradeImage[]>;
  deleteImage(tradeId: string, imageId: string, userEmail: string): Promise<{ id: string }>;
  getGallery(userEmail: string): Promise<GalleryItem[]>;
}
