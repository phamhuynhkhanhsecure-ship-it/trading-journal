import { useState, useCallback, useEffect } from 'react';
import type { Trade } from '../../types';
import { formatCurrencyShort } from '../../utils/calendarUtils';
import { useImageZoom } from '../../hooks/useImageZoom';
import { useTranslation } from 'react-i18next';
import { tradeApi, playbookApi, getImageUrl } from '../../services/api';
import '../Rules/Rules.css';
import './TradeForm.css';



interface TradeDetailModalProps {
  trade: Trade;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  onUpdate?: (trade: Trade) => void;
}

export default function TradeDetailModal({ trade, onClose, onEdit, onUpdate }: TradeDetailModalProps) {
  const { t, i18n } = useTranslation();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'detail' | 'review'>('detail');
  const [reviewForm, setReviewForm] = useState({
    reviewNotes: trade.reviewNotes || '',
    mistakes: trade.mistakes || '',
    lessons: trade.lessons || '',
  });
  const [savingReview, setSavingReview] = useState(false);
  const [playbookName, setPlaybookName] = useState<string>(trade.playbookId || '');

  useEffect(() => {
    if (trade.playbookId) {
      playbookApi.getById(trade.playbookId).then(pb => {
        setPlaybookName(pb.name);
      }).catch(err => console.error(err));
    }
  }, [trade.playbookId]);


  const {
    containerRef, resetZoom, zoomIn, zoomOut, zoomPercentage,
    handleWheel, handleMouseDown, handleMouseMove, handleMouseUp,
    imgStyle, isZoomed,
  } = useImageZoom();
  const pnlClass = trade.pnl > 0 ? 'day-detail__stat-value--profit' : trade.pnl < 0 ? 'day-detail__stat-value--loss' : '';

  const formattedDate = new Date(trade.date + 'T00:00:00').toLocaleDateString(i18n.language || 'vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const images = trade.images || [];

  // R:R
  const risk = trade.stopLoss > 0 ? Math.abs(trade.entryPrice - trade.stopLoss) : 0;
  const reward = trade.takeProfit > 0 ? Math.abs(trade.takeProfit - trade.entryPrice) : 0;
  const rrRatio = risk > 0 && reward > 0 ? (reward / risk).toFixed(2) : null;

  const openLightbox = (index: number) => { resetZoom(); setLightboxIndex(index); };
  const closeLightbox = () => { resetZoom(); setLightboxIndex(null); };
  const prevImage = useCallback(() => { resetZoom(); setLightboxIndex(i => i !== null ? (i - 1 + images.length) % images.length : null); }, [images.length, resetZoom]);
  const nextImage = useCallback(() => { resetZoom(); setLightboxIndex(i => i !== null ? (i + 1) % images.length : null); }, [images.length, resetZoom]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevImage();
      else if (e.key === 'ArrowRight') nextImage();
      else if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, prevImage, nextImage]);

  const handleSaveReview = async () => {
    setSavingReview(true);
    try {
      const updated = await tradeApi.update(trade.id, reviewForm);
      if (onUpdate) onUpdate(updated);
    } catch (err) { console.error(err); }
    finally { setSavingReview(false); }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal__header">
            <div className="trade-detail-tabs">
              <button className={`trade-detail-tab ${activeTab === 'detail' ? 'trade-detail-tab--active' : ''}`} onClick={() => setActiveTab('detail')}>{t('tradeDetail.titleDetail', 'Chi tiết')}</button>
              <button className={`trade-detail-tab ${activeTab === 'review' ? 'trade-detail-tab--active' : ''}`} onClick={() => setActiveTab('review')}>{t('tradeDetail.titleReview', 'Đánh giá')}</button>
            </div>
            <button className="modal__close-btn" onClick={onClose}>×</button>
          </div>
          <div className="modal__body">
            {activeTab === 'detail' ? (
              <>
                {/* Top Badge */}
                <div className="trade-detail__top">
                  <span className="trade-detail__instrument">{trade.instrument}</span>
                  <span className={`trade-detail__side trade-detail__side--${trade.side.toLowerCase()}`}>{trade.side}</span>
                  <span className={`trade-detail__pnl ${pnlClass}`}>{formatCurrencyShort(trade.pnl)}</span>
                  {trade.rating > 0 && <span className="trade-detail__rating">{'★'.repeat(trade.rating)}</span>}
                </div>

                <p className="trade-detail__date">{formattedDate}</p>

                {/* Price & Stats Grid */}
                <div className="trade-detail__grid">
                  <div className="trade-detail__cell">
                    <span className="trade-detail__label">{t('tradeDetail.entryPrice', 'Giá vào')}</span>
                    <span className="trade-detail__value">{trade.entryPrice}</span>
                  </div>
                  <div className="trade-detail__cell">
                    <span className="trade-detail__label">{t('tradeDetail.exitPrice', 'Giá ra')}</span>
                    <span className="trade-detail__value">{trade.exitPrice}</span>
                  </div>
                  <div className="trade-detail__cell">
                    <span className="trade-detail__label">{t('tradeDetail.quantity', 'Khối lượng')}</span>
                    <span className="trade-detail__value">{trade.quantity}</span>
                  </div>
                  <div className="trade-detail__cell">
                    <span className="trade-detail__label">{t('tradeDetail.fees', 'Phí')}</span>
                    <span className="trade-detail__value">{formatCurrencyShort(trade.fees)}</span>
                  </div>
                </div>

                {/* SL / TP / R:R */}
                {(trade.stopLoss > 0 || trade.takeProfit > 0) && (
                  <div className="trade-detail__grid" style={{ marginTop: 8 }}>
                    {trade.stopLoss > 0 && (
                      <div className="trade-detail__cell">
                        <span className="trade-detail__label">{t('tradeDetail.sl', 'Cắt lỗ')}</span>
                        <span className="trade-detail__value" style={{ color: 'var(--loss-color)' }}>{trade.stopLoss}</span>
                      </div>
                    )}
                    {trade.takeProfit > 0 && (
                      <div className="trade-detail__cell">
                        <span className="trade-detail__label">{t('tradeDetail.tp', 'Chốt lời')}</span>
                        <span className="trade-detail__value" style={{ color: 'var(--profit-color)' }}>{trade.takeProfit}</span>
                      </div>
                    )}
                    {rrRatio && (
                      <div className="trade-detail__cell">
                        <span className="trade-detail__label">{t('tradeDetail.rr', 'Tỷ lệ R:R')}</span>
                        <span className={`trade-detail__value ${parseFloat(rrRatio) >= 1 ? 'rr-value--good' : 'rr-value--bad'}`}>{rrRatio}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Playbook badge */}
                {trade.playbookId && (
                  <div className="trade-detail__section">
                    <span className="trade-detail__section-label">{t('tradeDetail.playbook', 'Chiến lược')}</span>
                    <span className="trade-detail__playbook-badge">📱 {playbookName}</span>
                  </div>
                )}

                {/* Tags */}
                {trade.tags && trade.tags.length > 0 && (
                  <div className="trade-detail__section">
                    <span className="trade-detail__section-label">{t('tradeDetail.tags', 'Nhãn')}</span>
                    <div className="trade-detail__tags">
                      {trade.tags.map((tag, i) => (
                        <span key={i} className="trade-detail__tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Images */}
                {images.length > 0 && (
                  <div className="trade-detail__section">
                    <span className="trade-detail__section-label">{t('tradeDetail.images', 'Hình ảnh')} ({images.length})</span>
                    <div className="trade-detail__images">
                      {images.map((img, i) => (
                        <div key={img.id} className="trade-detail__image-thumb" onClick={() => openLightbox(i)}>
                          <img src={getImageUrl(img)} alt={img.originalName} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {trade.notes && (
                  <div className="trade-detail__section">
                    <span className="trade-detail__section-label">{t('tradeDetail.notes', 'Ghi chú')}</span>
                    <p className="trade-detail__notes">{trade.notes}</p>
                  </div>
                )}
              </>
            ) : (
              /* ──── REVIEW TAB ──── */
              <div className="trade-review">
                <div className="trade-review__section">
                  <label className="trade-review__label">✅ {t('tradeDetail.good', 'Điều gì tốt?')}</label>
                  <textarea
                    className="trade-review__textarea"
                    placeholder={t('tradeDetail.goodPlaceholder', 'Tôi đã làm đúng điều gì...')}
                    value={reviewForm.reviewNotes}
                    onChange={e => setReviewForm(f => ({ ...f, reviewNotes: e.target.value }))}
                  />
                </div>
                <div className="trade-review__section">
                  <label className="trade-review__label">❌ {t('tradeDetail.mistakes', 'Sai lầm')}</label>
                  <textarea
                    className="trade-review__textarea"
                    placeholder={t('tradeDetail.mistakesPlaceholder', 'Tôi sai ở đâu...')}
                    value={reviewForm.mistakes}
                    onChange={e => setReviewForm(f => ({ ...f, mistakes: e.target.value }))}
                  />
                </div>
                <div className="trade-review__section">
                  <label className="trade-review__label">💡 {t('tradeDetail.lessons', 'Bài học rút ra')}</label>
                  <textarea
                    className="trade-review__textarea"
                    placeholder={t('tradeDetail.lessonsPlaceholder', 'Những điều rút ra được...')}
                    value={reviewForm.lessons}
                    onChange={e => setReviewForm(f => ({ ...f, lessons: e.target.value }))}
                  />
                </div>
                <button className="btn btn--primary" onClick={handleSaveReview} disabled={savingReview} style={{ marginTop: 8 }}>
                  {savingReview ? `${t('tradeDetail.saving', 'Đang lưu...')}` : `💾 ${t('tradeDetail.saveReview', 'Lưu đánh giá')}`}
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="trade-detail__footer">
              <button className="btn btn--secondary" onClick={onClose}>{t('tradeDetail.close', 'Đóng')}</button>
              <button className="btn btn--primary" onClick={() => onEdit(trade)}>{t('tradeDetail.editTrade', 'Sửa lệnh')}</button>
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
              <div
                className="lightbox__zoom-container"
                ref={containerRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img
                  src={getImageUrl(images[lightboxIndex])}
                  alt={images[lightboxIndex].originalName}
                  className="lightbox__img"
                  style={imgStyle}
                  draggable={false}
                />
              </div>
              <div className="lightbox__toolbar">
                <button className="lightbox__zoom-btn" onClick={zoomOut} title="Zoom Out">−</button>
                <span className="lightbox__zoom-level">{zoomPercentage}%</span>
                <button className="lightbox__zoom-btn" onClick={zoomIn} title="Zoom In">+</button>
                {isZoomed && (
                  <button className="lightbox__zoom-btn lightbox__zoom-btn--reset" onClick={resetZoom} title="Reset Zoom">⟲</button>
                )}
              </div>
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
