import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { Rule, RuleCreateInput, RuleUpdateInput, ApiResponse } from '../types.js';

const router = Router();

function rowToRule(row: any): Rule {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category || 'general',
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/rules - Get all rules
router.get('/', (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active === 'true';
    let rows: any[];

    if (activeOnly) {
      rows = db.prepare('SELECT * FROM rules WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC').all();
    } else {
      rows = db.prepare('SELECT * FROM rules ORDER BY sort_order ASC, created_at ASC').all();
    }

    const response: ApiResponse<Rule[]> = { success: true, data: rows.map(rowToRule) };
    res.json(response);
  } catch (error) {
    console.error('GET /api/rules error:', error);
    res.status(500).json({ success: false, error: 'Failed to read rules' });
  }
});

// POST /api/rules - Create a new rule
router.post('/', (req: Request, res: Response) => {
  try {
    const input: RuleCreateInput = req.body;
    if (!input.name || input.name.trim() === '') {
      res.status(400).json({ success: false, error: 'Rule name is required' });
      return;
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    // Get next sort order
    const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM rules').get() as any;
    const sortOrder = (maxSort?.max_sort ?? -1) + 1;

    db.prepare(`
      INSERT INTO rules (id, name, description, category, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    `).run(id, input.name.trim(), input.description || '', input.category || 'general', sortOrder, now, now);

    const rule: Rule = {
      id, name: input.name.trim(), description: input.description || '',
      category: input.category || 'general', isActive: true,
      sortOrder, createdAt: now, updatedAt: now,
    };

    const response: ApiResponse<Rule> = { success: true, data: rule };
    res.status(201).json(response);
  } catch (error) {
    console.error('POST /api/rules error:', error);
    res.status(500).json({ success: false, error: 'Failed to create rule' });
  }
});

// PUT /api/rules/:id - Update a rule
router.put('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM rules WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Rule not found' });
      return;
    }

    const input: RuleUpdateInput = req.body;
    const now = new Date().toISOString();
    const current = rowToRule(existing);

    const updated = {
      name: input.name?.trim() ?? current.name,
      description: input.description ?? current.description,
      category: input.category ?? current.category,
      isActive: input.isActive ?? current.isActive,
      sortOrder: input.sortOrder ?? current.sortOrder,
    };

    db.prepare(`
      UPDATE rules SET name = ?, description = ?, category = ?, is_active = ?, sort_order = ?, updated_at = ?
      WHERE id = ?
    `).run(updated.name, updated.description, updated.category, updated.isActive ? 1 : 0, updated.sortOrder, now, req.params.id);

    const rule: Rule = { id: req.params.id as string, ...updated, createdAt: current.createdAt, updatedAt: now };
    const response: ApiResponse<Rule> = { success: true, data: rule };
    res.json(response);
  } catch (error) {
    console.error('PUT /api/rules/:id error:', error);
    res.status(500).json({ success: false, error: 'Failed to update rule' });
  }
});

// DELETE /api/rules/:id - Delete a rule
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM rules WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Rule not found' });
      return;
    }

    db.prepare('DELETE FROM rules WHERE id = ?').run(req.params.id);
    const response: ApiResponse<Rule> = { success: true, data: rowToRule(existing) };
    res.json(response);
  } catch (error) {
    console.error('DELETE /api/rules/:id error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete rule' });
  }
});

// PUT /api/rules/reorder - Reorder rules
router.put('/reorder/batch', (req: Request, res: Response) => {
  try {
    const { order } = req.body as { order: { id: string; sortOrder: number }[] };
    if (!Array.isArray(order)) {
      res.status(400).json({ success: false, error: 'Invalid order data' });
      return;
    }

    const stmt = db.prepare('UPDATE rules SET sort_order = ?, updated_at = ? WHERE id = ?');
    const now = new Date().toISOString();

    const updateAll = db.transaction(() => {
      for (const item of order) {
        stmt.run(item.sortOrder, now, item.id);
      }
    });
    updateAll();

    res.json({ success: true, data: null });
  } catch (error) {
    console.error('PUT /api/rules/reorder error:', error);
    res.status(500).json({ success: false, error: 'Failed to reorder rules' });
  }
});

export default router;
