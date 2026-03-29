import { useState, useEffect, useRef } from 'react';
import { rulesApi, tradeApi } from '../../services/api';
import type { Trade, TradeImage, Rule } from '../../types';
import '../Rules/Rules.css';
import './TradeForm.css';

const API_HOST = 'http://localhost:3001';

const INSTRUMENTS = [
  'NZD-CHF', 'EUR-USD', 'USD-JPY', 'AUD-NZD', 'NZD-CAD',
  'AUD-CAD', 'AUD-CHF', 'AUD-USD', 'EUR-JPY', 'USD-CAD',
  'EUR-AUD', 'EUR-CAD', 'EUR-CHF', 'NZD-USD', 'GBP-AUD',
  'GBP-JPY', 'GBP-NZD', 'NZD-JPY', 'GBP-CAD', 'XAU-USD',
  'GBP-CHF', 'EUR-GBP',
] as const;
interface TradeModalProps {
  trade: Trade | null;
  defaultDate: string;
  onSubmit: (data: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

export default function TradeModal({ trade, defaultDate, onSubmit, onClose }: TradeModalProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [ruleChecklist, setRuleChecklist] = useState<Record<string, boolean>>({});
  const [existingImages, setExistingImages] = useState<TradeImage[]>(trade?.images || []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    date: trade?.date || defaultDate,
    instrument: trade?.instrument || '',
    side: trade?.side || 'LONG' as 'LONG' | 'SHORT',
    entryPrice: trade?.entryPrice?.toString() || '',
    exitPrice: trade?.exitPrice?.toString() || '',
    quantity: trade?.quantity?.toString() || '',
    pnl: trade?.pnl?.toString() || '',
    fees: trade?.fees?.toString() || '0',
    notes: trade?.notes || '',
    tags: trade?.tags?.join(', ') || '',
  });

  // Fetch active rules and initialize checklist
  useEffect(() => {
    rulesApi.getAll(true).then(activeRules => {
      setRules(activeRules);
      const initial: Record<string, boolean> = {};
      for (const rule of activeRules) {
        const existing = trade?.ruleChecklist?.find(rc => rc.ruleId === rule.id);
        initial[rule.id] = existing ? existing.followed : false;
      }
      setRuleChecklist(initial);
    }).catch(console.error);
  }, [trade]);

  const toggleRule = (ruleId: string) => {
    setRuleChecklist(prev => ({ ...prev, [ruleId]: !prev[ruleId] }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalCount = existingImages.length + newFiles.length + files.length;
    if (totalCount > 10) {
      alert(`Maximum 10 images per trade. You already have ${existingImages.length + newFiles.length}.`);
      return;
    }
    setNewFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (imageId: string) => {
    if (!trade) return;
    try {
      await tradeApi.deleteImage(trade.id, imageId);
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err) {
      console.error('Failed to delete image:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      // First submit the trade data
      const tradeData: any = {
        date: form.date,
        instrument: form.instrument,
        side: form.side as 'LONG' | 'SHORT',
        entryPrice: parseFloat(form.entryPrice) || 0,
        exitPrice: parseFloat(form.exitPrice) || 0,
        quantity: parseFloat(form.quantity) || 0,
        pnl: parseFloat(form.pnl) || 0,
        fees: parseFloat(form.fees) || 0,
        notes: form.notes,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        images: existingImages,
        ruleChecklist: rules.map(r => ({
          ruleId: r.id,
          ruleName: r.name,
          followed: ruleChecklist[r.id] || false,
        })),
      };

      // For existing trade — upload new files after submit
      if (trade && newFiles.length > 0) {
        await tradeApi.uploadImages(trade.id, newFiles);
      }

      // Call parent onSubmit — it handles create/update
      await onSubmit(tradeData);

      // For new trade, we need to upload after creation (parent handles this via callback)
      // The parent component will need to handle uploading files for new trades
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setUploading(false);
    }
  };

  const checkedCount = Object.values(ruleChecklist).filter(Boolean).length;
  const totalRules = rules.length;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    const totalCount = existingImages.length + newFiles.length + files.length;
    if (totalCount > 10) {
      alert(`Maximum 10 images per trade.`);
      return;
    }
    setNewFiles(prev => [...prev, ...files]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Store newFiles in a ref so parent can access them
  // We expose them through a data attribute on the form
  useEffect(() => {
    const formEl = document.getElementById('trade-form');
    if (formEl) {
      (formEl as any).__pendingFiles = newFiles;
    }
  }, [newFiles]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">
            {trade ? 'Edit Trade' : 'New Trade'}
          </h2>
          <button className="modal__close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          <form id="trade-form" className="trade-form" onSubmit={handleSubmit}>
            <div className="trade-form__row">
              <div className="trade-form__field">
                <label className="trade-form__label">Date</label>
                <input
                  type="date"
                  name="date"
                  className="trade-form__input"
                  value={form.date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="trade-form__field">
                <label className="trade-form__label">Instrument</label>
                <select
                  name="instrument"
                  className="trade-form__select"
                  value={form.instrument}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled>Select instrument...</option>
                  {INSTRUMENTS.map(pair => (
                    <option key={pair} value={pair}>{pair}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="trade-form__row">
              <div className="trade-form__field">
                <label className="trade-form__label">Side</label>
                <select
                  name="side"
                  className="trade-form__select"
                  value={form.side}
                  onChange={handleChange}
                >
                  <option value="LONG">Long</option>
                  <option value="SHORT">Short</option>
                </select>
              </div>
              <div className="trade-form__field">
                <label className="trade-form__label">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  className="trade-form__input"
                  value={form.quantity}
                  onChange={handleChange}
                  step="any"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="trade-form__row">
              <div className="trade-form__field">
                <label className="trade-form__label">Entry Price</label>
                <input
                  type="number"
                  name="entryPrice"
                  className="trade-form__input"
                  value={form.entryPrice}
                  onChange={handleChange}
                  step="any"
                  min="0"
                  required
                />
              </div>
              <div className="trade-form__field">
                <label className="trade-form__label">Exit Price</label>
                <input
                  type="number"
                  name="exitPrice"
                  className="trade-form__input"
                  value={form.exitPrice}
                  onChange={handleChange}
                  step="any"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="trade-form__row">
              <div className="trade-form__field">
                <label className="trade-form__label">P/L ($)</label>
                <input
                  type="number"
                  name="pnl"
                  className="trade-form__input"
                  value={form.pnl}
                  onChange={handleChange}
                  step="any"
                  required
                />
              </div>
              <div className="trade-form__field">
                <label className="trade-form__label">Fees ($)</label>
                <input
                  type="number"
                  name="fees"
                  className="trade-form__input"
                  value={form.fees}
                  onChange={handleChange}
                  step="any"
                  min="0"
                />
              </div>
            </div>

            <div className="trade-form__field trade-form__field--full">
              <label className="trade-form__label">Tags</label>
              <input
                type="text"
                name="tags"
                className="trade-form__input"
                value={form.tags}
                onChange={handleChange}
                placeholder="e.g. futures, scalp, swing (comma separated)"
              />
            </div>

            {/* Rule Checklist */}
            {rules.length > 0 && (
              <div className="trade-form__field trade-form__field--full">
                <label className="trade-form__label">
                  Rule Checklist ({checkedCount}/{totalRules})
                </label>
                <div className="rule-checklist">
                  {rules.map(rule => (
                    <div
                      key={rule.id}
                      className={`rule-check-item ${ruleChecklist[rule.id] ? 'rule-check-item--checked' : ''}`}
                      onClick={() => toggleRule(rule.id)}
                    >
                      <div className="rule-check-item__checkbox">
                        {ruleChecklist[rule.id] ? '✓' : ''}
                      </div>
                      <span className="rule-check-item__name">{rule.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Images Section */}
            <div className="trade-form__field trade-form__field--full">
              <label className="trade-form__label">
                Images ({existingImages.length + newFiles.length}/10)
              </label>

              {/* Existing images thumbnails */}
              {existingImages.length > 0 && (
                <div className="image-thumbs">
                  {existingImages.map(img => (
                    <div key={img.id} className="image-thumb">
                      <img
                        src={`${API_HOST}/uploads/${img.filename}`}
                        alt={img.originalName}
                        className="image-thumb__img"
                      />
                      <button
                        type="button"
                        className="image-thumb__remove"
                        onClick={() => removeExistingImage(img.id)}
                        title="Remove image"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* New files thumbnails */}
              {newFiles.length > 0 && (
                <div className="image-thumbs">
                  {newFiles.map((file, i) => (
                    <div key={i} className="image-thumb image-thumb--new">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="image-thumb__img"
                      />
                      <button
                        type="button"
                        className="image-thumb__remove"
                        onClick={() => removeNewFile(i)}
                        title="Remove"
                      >×</button>
                      <span className="image-thumb__badge">NEW</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop zone */}
              <div
                className="image-dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <span className="image-dropzone__icon">📷</span>
                <span className="image-dropzone__text">
                  Click or drag images here
                </span>
                <span className="image-dropzone__hint">
                  JPEG, PNG, GIF, WebP • max 5MB
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>

            <div className="trade-form__field trade-form__field--full">
              <label className="trade-form__label">Notes</label>
              <textarea
                name="notes"
                className="trade-form__textarea"
                value={form.notes}
                onChange={handleChange}
                placeholder="Trade notes..."
              />
            </div>

            <div className="trade-form__actions">
              <button type="button" className="btn btn--secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={uploading}>
                {uploading ? 'Saving...' : trade ? 'Update Trade' : 'Add Trade'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
