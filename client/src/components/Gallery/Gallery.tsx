import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { tradeApi, getImageUrl } from '../../services/api';
import { formatCurrencyShort } from '../../utils/calendarUtils';
import { useImageZoom } from '../../hooks/useImageZoom';
import type { GalleryImage } from '../../types';
import './Gallery.css';

const ITEMS_PER_PAGE = 24;

export default function Gallery() {
  const { t, i18n } = useTranslation();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [filterInstrument, setFilterInstrument] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    containerRef, resetZoom, zoomIn, zoomOut, zoomPercentage,
    handleWheel, handleMouseDown, handleMouseMove, handleMouseUp,
    imgStyle, isZoomed,
  } = useImageZoom();

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

  const instruments = useMemo(() => {
    return [...new Set(images.map(img => img.instrument))].sort();
  }, [images]);

  const sortedFiltered = useMemo(() => {
    const result = filterInstrument
      ? images.filter(img => img.instrument === filterInstrument)
      : images;
    
    // Sort by date descending
    return [...result].sort((a, b) => {
      const dateDiff = b.tradeDate.localeCompare(a.tradeDate);
      if (dateDiff !== 0) return dateDiff;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [images, filterInstrument]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterInstrument]);

  const totalPages = Math.ceil(sortedFiltered.length / ITEMS_PER_PAGE);

  const paginatedImages = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedFiltered.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedFiltered, currentPage]);

  // Group by date for display
  const grouped = useMemo(() => {
    return paginatedImages.reduce<Record<string, GalleryImage[]>>((acc, img) => {
      const date = img.tradeDate;
      if (!acc[date]) acc[date] = [];
      acc[date].push(img);
      return acc;
    }, {});
  }, [paginatedImages]);

  const sortedDates = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  }, [grouped]);

  const openLightbox = (imgToOpen: GalleryImage) => {
    resetZoom();
    const index = sortedFiltered.findIndex(img => img.id === imgToOpen.id);
    if (index !== -1) {
      setLightboxIndex(index);
    }
  };

  const closeLightbox = () => {
    resetZoom();
    setLightboxIndex(null);
  };

  const prevImage = useCallback(() => {
    resetZoom();
    setLightboxIndex(i => i !== null ? (i - 1 + sortedFiltered.length) % sortedFiltered.length : null);
  }, [sortedFiltered.length, resetZoom]);

  const nextImage = useCallback(() => {
    resetZoom();
    setLightboxIndex(i => i !== null ? (i + 1) % sortedFiltered.length : null);
  }, [sortedFiltered.length, resetZoom]);

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
          <p>{t('gallery.loading', 'Đang tải thư viện ảnh...')}</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(i18n.language || 'vi-VN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      const galleryPage = document.querySelector('.gallery-page');
      if (galleryPage) {
        galleryPage.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="gallery-page">
      <div className="gallery-page__header">
        <div className="gallery-page__title-area">
          <h1 className="gallery-page__title">🖼️ {t('layout.gallery', 'Thư viện ảnh')}</h1>
          <span className="gallery-page__count">{sortedFiltered.length} {t('gallery.images', 'ảnh')}</span>
        </div>

        {instruments.length > 1 && (
          <div className="gallery-page__filters">
            <select
              className="gallery-filter__select"
              value={filterInstrument}
              onChange={e => setFilterInstrument(e.target.value)}
            >
              <option value="">{t('gallery.allPairs', 'Tất cả cặp tiền')}</option>
              {instruments.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {sortedFiltered.length === 0 ? (
        <div className="gallery-empty">
          <div className="gallery-empty__icon">🖼️</div>
          <h2 className="gallery-empty__title">{t('gallery.emptyTitle', 'Chưa có hình ảnh')}</h2>
          <p className="gallery-empty__text">
            {t('gallery.emptyDesc', 'Tải hình ảnh khi tạo hoặc chỉnh sửa lệnh để xem ở đây.')}
          </p>
        </div>
      ) : (
        <>
          <div className="gallery-content">
            {sortedDates.map(date => (
              <div key={date} className="gallery-group">
                <div className="gallery-group__header">
                  <span className="gallery-group__date">{formatDate(date)}</span>
                  <span className="gallery-group__count">{grouped[date].length} {t('gallery.images', 'ảnh')}</span>
                </div>
                <div className="gallery-grid">
                  {grouped[date].map((img) => (
                    <div
                      key={img.id}
                      className="gallery-card"
                      onClick={() => openLightbox(img)}
                    >
                      <div className="gallery-card__img-wrapper">
                        <img
                          src={getImageUrl(img)}
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

          {totalPages > 1 && (
            <div className="gallery-pagination">
              <button 
                className="gallery-pagination__btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                {t('gallery.prev', 'Trang trước')}
              </button>
              <div className="gallery-pagination__info">
                <span>{currentPage}</span>
                <span className="gallery-pagination__separator">/</span>
                <span>{totalPages}</span>
              </div>
              <button 
                className="gallery-pagination__btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                {t('gallery.next', 'Trang tiếp')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && sortedFiltered[lightboxIndex] && (
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
                  src={getImageUrl(sortedFiltered[lightboxIndex])}
                  alt={sortedFiltered[lightboxIndex].originalName}
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
                <div className="lightbox__trade-info">
                  <span className="lightbox__instrument">{sortedFiltered[lightboxIndex].instrument}</span>
                  <span className={`lightbox__side lightbox__side--${sortedFiltered[lightboxIndex].side.toLowerCase()}`}>
                    {sortedFiltered[lightboxIndex].side}
                  </span>
                  <span className={`lightbox__pnl ${sortedFiltered[lightboxIndex].pnl > 0 ? 'lightbox__pnl--profit' : sortedFiltered[lightboxIndex].pnl < 0 ? 'lightbox__pnl--loss' : ''}`}>
                    {formatCurrencyShort(sortedFiltered[lightboxIndex].pnl)}
                  </span>
                </div>
                <div className="lightbox__meta">
                  <span className="lightbox__counter">{lightboxIndex + 1} / {sortedFiltered.length}</span>
                  <span className="lightbox__date">{formatDate(sortedFiltered[lightboxIndex].tradeDate)}</span>
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
