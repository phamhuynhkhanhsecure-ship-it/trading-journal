import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { Trade, TradeImage, TradeCreateInput, TradeUpdateInput, TradeRuleEntry, ApiResponse } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ===== Multer config =====
const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ===== Helpers =====

function getTradeRules(tradeId: string): TradeRuleEntry[] {
  const rows = db.prepare(`
    SELECT tr.rule_id, tr.followed, r.name as rule_name
    FROM trade_rules tr
    JOIN rules r ON r.id = tr.rule_id
    WHERE tr.trade_id = ?
    ORDER BY r.sort_order ASC
  `).all(tradeId) as any[];

  return rows.map(r => ({
    ruleId: r.rule_id,
    ruleName: r.rule_name,
    followed: r.followed === 1,
  }));
}

function saveTradeRules(tradeId: string, checklist: { ruleId: string; followed: boolean }[]): void {
  db.prepare('DELETE FROM trade_rules WHERE trade_id = ?').run(tradeId);

  if (checklist && checklist.length > 0) {
    const stmt = db.prepare('INSERT INTO trade_rules (trade_id, rule_id, followed) VALUES (?, ?, ?)');
    for (const item of checklist) {
      stmt.run(tradeId, item.ruleId, item.followed ? 1 : 0);
    }
  }
}

function getTradeImages(tradeId: string): TradeImage[] {
  const rows = db.prepare(
    'SELECT * FROM trade_images WHERE trade_id = ? ORDER BY sort_order ASC, created_at ASC'
  ).all(tradeId) as any[];

  return rows.map(r => ({
    id: r.id,
    tradeId: r.trade_id,
    filename: r.filename,
    originalName: r.original_name,
    mimeType: r.mime_type,
    size: r.size,
    caption: r.caption || '',
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }));
}

function rowToTrade(row: any): Trade {
  const ruleChecklist = getTradeRules(row.id);
  const images = getTradeImages(row.id);
  return {
    id: row.id,
    date: row.date,
    instrument: row.instrument,
    side: row.side,
    entryPrice: row.entry_price,
    exitPrice: row.exit_price,
    quantity: row.quantity,
    pnl: row.pnl,
    fees: row.fees,
    notes: row.notes || '',
    tags: JSON.parse(row.tags || '[]'),
    images,
    ruleChecklist,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ===== Trade CRUD =====

// GET /api/trades
router.get('/', (req: Request, res: Response) => {
  try {
    const { year, month } = req.query;

    let rows: any[];
    if (year && month) {
      const y = parseInt(year as string);
      const m = parseInt(month as string);
      const datePrefix = `${y}-${String(m).padStart(2, '0')}`;
      rows = db.prepare('SELECT * FROM trades WHERE date LIKE ? ORDER BY date ASC, created_at ASC').all(`${datePrefix}%`);
    } else {
      rows = db.prepare('SELECT * FROM trades ORDER BY date ASC, created_at ASC').all();
    }

    const trades = rows.map(rowToTrade);
    const response: ApiResponse<Trade[]> = { success: true, data: trades };
    res.json(response);
  } catch (error) {
    console.error('GET /api/trades error:', error);
    res.status(500).json({ success: false, error: 'Failed to read trades' });
  }
});

// GET /api/trades/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
    if (!row) {
      res.status(404).json({ success: false, error: 'Trade not found' });
      return;
    }
    res.json({ success: true, data: rowToTrade(row) });
  } catch (error) {
    console.error('GET /api/trades/:id error:', error);
    res.status(500).json({ success: false, error: 'Failed to read trade' });
  }
});

// POST /api/trades
router.post('/', (req: Request, res: Response) => {
  try {
    const input: TradeCreateInput = req.body;
    const now = new Date().toISOString();
    const id = uuidv4();

    const insertTrade = db.transaction(() => {
      db.prepare(`
        INSERT INTO trades (id, date, instrument, side, entry_price, exit_price, quantity, pnl, fees, notes, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, input.date, input.instrument, input.side,
        input.entryPrice || 0, input.exitPrice || 0, input.quantity || 0,
        input.pnl || 0, input.fees || 0, input.notes || '',
        JSON.stringify(input.tags || []), now, now,
      );

      if (input.ruleChecklist && input.ruleChecklist.length > 0) {
        saveTradeRules(id, input.ruleChecklist);
      }
    });
    insertTrade();

    const trade = rowToTrade(db.prepare('SELECT * FROM trades WHERE id = ?').get(id));
    res.status(201).json({ success: true, data: trade });
  } catch (error) {
    console.error('POST /api/trades error:', error);
    res.status(500).json({ success: false, error: 'Failed to create trade' });
  }
});

// PUT /api/trades/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Trade not found' });
      return;
    }

    const input: TradeUpdateInput = req.body;
    const now = new Date().toISOString();
    const current = rowToTrade(existing);

    const updated = {
      date: input.date ?? current.date,
      instrument: input.instrument ?? current.instrument,
      side: input.side ?? current.side,
      entryPrice: input.entryPrice ?? current.entryPrice,
      exitPrice: input.exitPrice ?? current.exitPrice,
      quantity: input.quantity ?? current.quantity,
      pnl: input.pnl ?? current.pnl,
      fees: input.fees ?? current.fees,
      notes: input.notes ?? current.notes,
      tags: input.tags ?? current.tags,
    };

    const updateTrade = db.transaction(() => {
      db.prepare(`
        UPDATE trades SET
          date = ?, instrument = ?, side = ?, entry_price = ?, exit_price = ?,
          quantity = ?, pnl = ?, fees = ?, notes = ?, tags = ?, updated_at = ?
        WHERE id = ?
      `).run(
        updated.date, updated.instrument, updated.side,
        updated.entryPrice, updated.exitPrice, updated.quantity,
        updated.pnl, updated.fees, updated.notes,
        JSON.stringify(updated.tags), now, req.params.id,
      );

      if (input.ruleChecklist !== undefined) {
        saveTradeRules(req.params.id as string, input.ruleChecklist || []);
      }
    });
    updateTrade();

    const trade = rowToTrade(db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id));
    res.json({ success: true, data: trade });
  } catch (error) {
    console.error('PUT /api/trades/:id error:', error);
    res.status(500).json({ success: false, error: 'Failed to update trade' });
  }
});

// DELETE /api/trades/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Trade not found' });
      return;
    }
    const trade = rowToTrade(existing);

    // Delete image files from disk
    for (const img of trade.images) {
      const filePath = path.join(UPLOADS_DIR, img.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    db.prepare('DELETE FROM trades WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: trade });
  } catch (error) {
    console.error('DELETE /api/trades/:id error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete trade' });
  }
});

// POST /api/trades/bulk
router.post('/bulk', (req: Request, res: Response) => {
  try {
    const { trades: inputTrades } = req.body as { trades: TradeCreateInput[] };
    if (!Array.isArray(inputTrades) || inputTrades.length === 0) {
      res.status(400).json({ success: false, error: 'No trades provided' });
      return;
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO trades (id, date, instrument, side, entry_price, exit_price, quantity, pnl, fees, notes, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((trades: TradeCreateInput[]) => {
      const ids: string[] = [];
      for (const input of trades) {
        const id = uuidv4();
        stmt.run(
          id, input.date, input.instrument, input.side,
          input.entryPrice || 0, input.exitPrice || 0, input.quantity || 0,
          input.pnl || 0, input.fees || 0, input.notes || '',
          JSON.stringify(input.tags || []), now, now,
        );
        if (input.ruleChecklist) {
          saveTradeRules(id, input.ruleChecklist);
        }
        ids.push(id);
      }
      return ids;
    });

    const ids = insertMany(inputTrades);
    const created = ids.map(id => rowToTrade(db.prepare('SELECT * FROM trades WHERE id = ?').get(id)));
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('POST /api/trades/bulk error:', error);
    res.status(500).json({ success: false, error: 'Failed to bulk import trades' });
  }
});

// ===== Image Endpoints =====

// POST /api/trades/:id/images — Upload images
router.post('/:id/images', upload.array('images', 10), (req: Request, res: Response) => {
  try {
    const tradeRow = db.prepare('SELECT id FROM trades WHERE id = ?').get(req.params.id);
    if (!tradeRow) {
      // Clean up uploaded files
      const files = req.files as Express.Multer.File[];
      if (files) {
        for (const f of files) {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        }
      }
      res.status(404).json({ success: false, error: 'Trade not found' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No files uploaded' });
      return;
    }

    // Check existing image count
    const existingCount = (db.prepare('SELECT COUNT(*) as cnt FROM trade_images WHERE trade_id = ?').get(req.params.id) as any).cnt;
    if (existingCount + files.length > 10) {
      // Clean up
      for (const f of files) {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      }
      res.status(400).json({ success: false, error: `Maximum 10 images per trade. Currently ${existingCount}, tried to add ${files.length}.` });
      return;
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(
      'INSERT INTO trade_images (id, trade_id, filename, original_name, mime_type, size, caption, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    const insertImages = db.transaction(() => {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        stmt.run(uuidv4(), req.params.id, f.filename, f.originalname, f.mimetype, f.size, '', existingCount + i, now);
      }
    });
    insertImages();

    const images = getTradeImages(req.params.id);
    res.status(201).json({ success: true, data: images });
  } catch (error) {
    console.error('POST /api/trades/:id/images error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload images' });
  }
});

// DELETE /api/trades/:id/images/:imageId — Delete single image
router.delete('/:id/images/:imageId', (req: Request, res: Response) => {
  try {
    const imgRow = db.prepare(
      'SELECT * FROM trade_images WHERE id = ? AND trade_id = ?'
    ).get(req.params.imageId, req.params.id) as any;

    if (!imgRow) {
      res.status(404).json({ success: false, error: 'Image not found' });
      return;
    }

    // Delete file from disk
    const filePath = path.join(UPLOADS_DIR, imgRow.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM trade_images WHERE id = ?').run(req.params.imageId);
    res.json({ success: true, data: { id: req.params.imageId } });
  } catch (error) {
    console.error('DELETE image error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete image' });
  }
});

// GET /api/trades/gallery — Get all images across all trades
router.get('/gallery/all', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT ti.*, t.date as trade_date, t.instrument, t.side, t.pnl
      FROM trade_images ti
      JOIN trades t ON t.id = ti.trade_id
      ORDER BY t.date DESC, ti.sort_order ASC
    `).all() as any[];

    const items = rows.map(r => ({
      id: r.id,
      tradeId: r.trade_id,
      filename: r.filename,
      originalName: r.original_name,
      mimeType: r.mime_type,
      size: r.size,
      caption: r.caption || '',
      sortOrder: r.sort_order,
      createdAt: r.created_at,
      tradeDate: r.trade_date,
      instrument: r.instrument,
      side: r.side,
      pnl: r.pnl,
    }));

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('GET /api/trades/gallery/all error:', error);
    res.status(500).json({ success: false, error: 'Failed to read gallery' });
  }
});

export default router;
