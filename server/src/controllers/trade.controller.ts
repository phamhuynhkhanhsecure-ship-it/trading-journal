import type { Request, Response } from 'express';
import multer from 'multer';
import type { ITradeService, ITradeImageService } from '../interfaces/trade.interfaces.js';
import type { TradeFilter } from '../types.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    cb(null, allowed.includes(file.mimetype));
  },
});

/**
 * Trade controller — SRP: only request/response orchestration.
 * No business logic, no DB access.
 */
export class TradeController {
  /** Multer middleware for image uploads — exposed for route binding. */
  readonly uploadMiddleware = upload.array('images', 10);

  constructor(
    private readonly tradeService: ITradeService,
    private readonly imageService: ITradeImageService,
  ) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const { year, month, instrument, side, tag, dateFrom, dateTo, pnlMin, pnlMax, search, playbookId, rating } = req.query;
    const filter: TradeFilter = {
      year: year ? parseInt(year as string) : undefined,
      month: month ? parseInt(month as string) : undefined,
      instrument: instrument as string,
      side: side as 'LONG' | 'SHORT',
      tag: tag as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      pnlMin: pnlMin ? parseFloat(pnlMin as string) : undefined,
      pnlMax: pnlMax ? parseFloat(pnlMax as string) : undefined,
      search: search as string,
      playbookId: playbookId as string,
      rating: rating ? parseInt(rating as string) : undefined,
    };
    const data = await this.tradeService.getAll(filter, userEmail);
    res.json({ success: true, data });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.tradeService.getById(req.params.id as string, userEmail);
    res.json({ success: true, data });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.tradeService.create(req.body, userEmail);
    res.status(201).json({ success: true, data });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.tradeService.update(req.params.id as string, req.body, userEmail);
    res.json({ success: true, data });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.tradeService.delete(req.params.id as string, userEmail);
    res.json({ success: true, data });
  };

  bulkCreate = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const { trades } = req.body;
    if (!Array.isArray(trades) || trades.length === 0) {
      res.status(400).json({ success: false, error: 'No trades provided' });
      return;
    }
    const data = await this.tradeService.bulkCreate(trades, userEmail);
    res.status(201).json({ success: true, data });
  };

  uploadImages = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const files = req.files as Express.Multer.File[];
    const data = await this.imageService.uploadImages(req.params.id as string, files, userEmail);
    res.status(201).json({ success: true, data });
  };

  deleteImage = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.imageService.deleteImage(req.params.id as string, req.params.imageId as string, userEmail);
    res.json({ success: true, data });
  };

  getGallery = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.imageService.getGallery(userEmail);
    res.json({ success: true, data });
  };
}
