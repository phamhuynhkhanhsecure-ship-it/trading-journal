import { useState, useEffect, useCallback } from 'react';
import { tradeApi } from '../../services/api';
import { formatCurrencyShort } from '../../utils/calendarUtils';
import type { GalleryImage } from '../../types';
import './Gallery.css';

const API_HOST = 'http://localhost:3001';

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [filterInstrument, setFilterInstrument] = useState('');

  useEffect(() => {
    tradeApi.getGallery()
      .then(data => {
        setImages(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load gallery:', err);
        setLoading(false);
      });
  }, []);

  const instruments = [...new Set(images.map(img => img.instrument))].sort();

  const filtered = filterInstrument
    ? images.filter(img => img.instrument === filterInstrument)
    : images;

  // Group by date
  const grouped = filtered.reduce<Record<string, GalleryImage[]>>((acc, img) => {
    const date = img.tradeDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(img);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const openLightbox = (globalIndex: number) => setLightboxIndex(globalIndex);
  const closeLightbox = () => setLightboxIndex(null);

  const prevImage = useCallback(() => {
    setLightboxIndex(i => i !== null ? (i - 1 + filtered.length) % filtered.length : null);
  }, [filtered.length]);

  const nextImage = useCallback(() => {
    setLightboxIndex(i => i !== null ? (i + 1) % filtered.length : null);
  }, [filtered.length]);

  // Keyboard navigation
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

  if (loading) {
    return (
      <div className="gallery-page">
        <div className="gallery-loading">
          <div className="gallery-loading__spinner" />
          <p>Loading gallery...</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Build a flat array index for lightbox
  let globalIndex = 0;
  const dateIndexMap: Record<string, number[]> = {};
  for (const date of sortedDates) {
    dateIndexMap[date] = [];
    for (let i = 0; i < grouped[date].length; i++) {
      dateIndexMap[date].push(globalIndex++);
    }
  }

  return (
    <div className="gallery-page">
      <div className="gallery-page__header">
        <div className="gallery-page__title-area">
          <h1 className="gallery-page__title">🖼️ Gallery</h1>
          <span className="gallery-page__count">{filtered.length} images</span>
        </div>

        {instruments.length > 1 && (
          <div className="gallery-page__filters">
            <select
              className="gallery-filter__select"
              value={filterInstrument}
              onChange={e => setFilterInstrument(e.target.value)}
            >
              <option value="">All Instruments</option>
              {instruments.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="gallery-empty">
          <div className="gallery-empty__icon">🖼️</div>
          <h2 className="gallery-empty__title">No images yet</h2>
          <p className="gallery-empty__text">
            Upload images when creating or editing trades to see them here.
          </p>
        </div>
      ) : (
        <div className="gallery-content">
          {sortedDates.map(date => (
            <div key={date} className="gallery-group">
              <div className="gallery-group__header">
                <span className="gallery-group__date">{formatDate(date)}</span>
                <span className="gallery-group__count">{grouped[date].length} images</span>
              </div>
              <div className="gallery-grid">
                {grouped[date].map((img, i) => (
                  <div
                    key={img.id}
                    className="gallery-card"
                    onClick={() => openLightbox(dateIndexMap[date][i])}
                  >
                    <div className="gallery-card__img-wrapper">
                      <img
                        src={`${API_HOST}/uploads/${img.filename}`}
                        alt={img.originalName}
                        className="gallery-card__img"
                        loading="lazy"
                      />
                      <div className="gallery-card__overlay">
                        <span className="gallery-card__zoom">🔍</span>
                      </div>
                    </div>
                    <div className="gallery-card__info">
                      <div className="gallery-card__trade">
                        <span className="gallery-card__instrument">{img.instrument}</span>
                        <span className={`gallery-card__side gallery-card__side--${img.side.toLowerCase()}`}>
                          {img.side}
                        </span>
                      </div>
                      <span className={`gallery-card__pnl ${img.pnl > 0 ? 'gallery-card__pnl--profit' : img.pnl < 0 ? 'gallery-card__pnl--loss' : ''}`}>
                        {formatCurrencyShort(img.pnl)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox" onClick={e => e.stopPropagation()}>
            <button className="lightbox__close" onClick={closeLightbox}>×</button>
            <button className="lightbox__nav lightbox__nav--prev" onClick={prevImage}>‹</button>
            <div className="lightbox__content">
              <img
                src={`${API_HOST}/uploads/${filtered[lightboxIndex].filename}`}
                alt={filtered[lightboxIndex].originalName}
                className="lightbox__img"
              />
              <div className="lightbox__info">
                <div className="lightbox__trade-info">
                  <span className="lightbox__instrument">{filtered[lightboxIndex].instrument}</span>
                  <span className={`lightbox__side lightbox__side--${filtered[lightboxIndex].side.toLowerCase()}`}>
                    {filtered[lightboxIndex].side}
                  </span>
                  <span className={`lightbox__pnl ${filtered[lightboxIndex].pnl > 0 ? 'lightbox__pnl--profit' : filtered[lightboxIndex].pnl < 0 ? 'lightbox__pnl--loss' : ''}`}>
                    {formatCurrencyShort(filtered[lightboxIndex].pnl)}
                  </span>
                </div>
                <div className="lightbox__meta">
                  <span className="lightbox__counter">{lightboxIndex + 1} / {filtered.length}</span>
                  <span className="lightbox__date">{formatDate(filtered[lightboxIndex].tradeDate)}</span>
                </div>
              </div>
            </div>
            <button className="lightbox__nav lightbox__nav--next" onClick={nextImage}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}
