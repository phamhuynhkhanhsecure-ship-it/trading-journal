import { useState } from 'react';
import type { Trade } from '../../types';
import { formatCurrencyShort } from '../../utils/calendarUtils';
import '../Rules/Rules.css';
import './TradeForm.css';

const API_HOST = 'http://localhost:3001';

interface TradeDetailModalProps {
  trade: Trade;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
}

export default function TradeDetailModal({ trade, onClose, onEdit }: TradeDetailModalProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const pnlClass = trade.pnl > 0 ? 'day-detail__stat-value--profit' : trade.pnl < 0 ? 'day-detail__stat-value--loss' : '';

  const formattedDate = new Date(trade.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const ruleCount = trade.ruleChecklist?.length || 0;
  const followedCount = trade.ruleChecklist?.filter(r => r.followed).length || 0;
  const images = trade.images || [];

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () => setLightboxIndex(i => i !== null ? (i - 1 + images.length) % images.length : null);
  const nextImage = () => setLightboxIndex(i => i !== null ? (i + 1) % images.length : null);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal__header">
            <h2 className="modal__title">Trade Detail</h2>
            <button className="modal__close-btn" onClick={onClose}>×</button>
          </div>
          <div className="modal__body">
            {/* Top Badge */}
            <div className="trade-detail__top">
              <span className="trade-detail__instrument">{trade.instrument}</span>
              <span className={`trade-detail__side trade-detail__side--${trade.side.toLowerCase()}`}>
                {trade.side}
              </span>
              <span className={`trade-detail__pnl ${pnlClass}`}>
                {formatCurrencyShort(trade.pnl)}
              </span>
            </div>

            <p className="trade-detail__date">{formattedDate}</p>

            {/* Price & Stats Grid */}
            <div className="trade-detail__grid">
              <div className="trade-detail__cell">
                <span className="trade-detail__label">Entry Price</span>
                <span className="trade-detail__value">{trade.entryPrice.toFixed(2)}</span>
              </div>
              <div className="trade-detail__cell">
                <span className="trade-detail__label">Exit Price</span>
                <span className="trade-detail__value">{trade.exitPrice.toFixed(2)}</span>
              </div>
              <div className="trade-detail__cell">
                <span className="trade-detail__label">Quantity</span>
                <span className="trade-detail__value">{trade.quantity}</span>
              </div>
              <div className="trade-detail__cell">
                <span className="trade-detail__label">Fees</span>
                <span className="trade-detail__value">{formatCurrencyShort(trade.fees)}</span>
              </div>
            </div>

            {/* Tags */}
            {trade.tags && trade.tags.length > 0 && (
              <div className="trade-detail__section">
                <span className="trade-detail__section-label">Tags</span>
                <div className="trade-detail__tags">
                  {trade.tags.map((tag, i) => (
                    <span key={i} className="trade-detail__tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Rule Checklist */}
            {ruleCount > 0 && (
              <div className="trade-detail__section">
                <span className="trade-detail__section-label">
                  Rule Compliance ({followedCount}/{ruleCount})
                </span>
                <div className="trade-detail__rules">
                  {trade.ruleChecklist.map(rc => (
                    <div
                      key={rc.ruleId}
                      className={`trade-detail__rule ${rc.followed ? 'trade-detail__rule--followed' : 'trade-detail__rule--violated'}`}
                    >
                      <span className="trade-detail__rule-icon">
                        {rc.followed ? '✓' : '✗'}
                      </span>
                      <span className="trade-detail__rule-name">{rc.ruleName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Images */}
            {images.length > 0 && (
              <div className="trade-detail__section">
                <span className="trade-detail__section-label">
                  Images ({images.length})
                </span>
                <div className="trade-detail__images">
                  {images.map((img, i) => (
                    <div
                      key={img.id}
                      className="trade-detail__image-thumb"
                      onClick={() => openLightbox(i)}
                    >
                      <img
                        src={`${API_HOST}/uploads/${img.filename}`}
                        alt={img.originalName}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {trade.notes && (
              <div className="trade-detail__section">
                <span className="trade-detail__section-label">Notes</span>
                <p className="trade-detail__notes">{trade.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="trade-detail__footer">
              <button className="btn btn--secondary" onClick={onClose}>
                Close
              </button>
              <button className="btn btn--primary" onClick={() => onEdit(trade)}>
                Edit Trade
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox" onClick={e => e.stopPropagation()}>
            <button className="lightbox__close" onClick={closeLightbox}>×</button>
            <button className="lightbox__nav lightbox__nav--prev" onClick={prevImage}>‹</button>
            <div className="lightbox__content">
              <img
                src={`${API_HOST}/uploads/${images[lightboxIndex].filename}`}
                alt={images[lightboxIndex].originalName}
                className="lightbox__img"
              />
              <div className="lightbox__info">
                <span className="lightbox__counter">{lightboxIndex + 1} / {images.length}</span>
                <span className="lightbox__filename">{images[lightboxIndex].originalName}</span>
              </div>
            </div>
            <button className="lightbox__nav lightbox__nav--next" onClick={nextImage}>›</button>
          </div>
        </div>
      )}
    </>
  );
}
