import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { tagsApi, playbookApi } from '../../services/api';
import type { Tag, Playbook, TradeFilters } from '../../types';
import './FilterBar.css';

interface FilterBarProps {
  instruments: string[];
  onFiltersChange: (filters: TradeFilters) => void;
}

export default function FilterBar({ instruments, onFiltersChange }: FilterBarProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tags, setTags] = useState<Tag[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [expanded, setExpanded] = useState(false);

  // Init from URL params
  const filters: TradeFilters = {
    instrument: searchParams.get('instrument') || undefined,
    side: searchParams.get('side') || undefined,
    tag: searchParams.get('tag') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    pnlMin: searchParams.get('pnlMin') || undefined,
    pnlMax: searchParams.get('pnlMax') || undefined,
    search: searchParams.get('search') || undefined,
    playbookId: searchParams.get('playbookId') || undefined,
    rating: searchParams.get('rating') || undefined,
  };

  const activeCount = Object.values(filters).filter(v => v).length;

  useEffect(() => {
    tagsApi.getAll().then(setTags).catch(console.error);
    playbookApi.getAll().then(setPlaybooks).catch(console.error);
  }, []);

  const updateFilter = useCallback((key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams, { replace: true });

    // Build new filters from updated params
    const newFilters: TradeFilters = {};
    newParams.forEach((v, k) => {
      (newFilters as any)[k] = v;
    });
    onFiltersChange(newFilters);
  }, [searchParams, setSearchParams, onFiltersChange]);

  const clearAll = useCallback(() => {
    setSearchParams({}, { replace: true });
    onFiltersChange({});
  }, [setSearchParams, onFiltersChange]);

  return (
    <div className="filter-bar">
      <div className="filter-bar__main">
        <div className="filter-bar__search">
          <svg className="filter-bar__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            className="filter-bar__search-input"
            placeholder={t('journal.search', 'Tìm lệnh...')}
            value={filters.search || ''}
            onChange={e => updateFilter('search', e.target.value)}
            id="filter-search"
          />
        </div>

        {/* Side toggle */}
        <div className="filter-bar__side-toggle">
          <button
            className={`filter-bar__side-btn ${!filters.side ? 'filter-bar__side-btn--active' : ''}`}
            onClick={() => updateFilter('side', '')}
          >{t('filter.all', 'Tất cả')}</button>
          <button
            className={`filter-bar__side-btn filter-bar__side-btn--long ${filters.side === 'LONG' ? 'filter-bar__side-btn--active' : ''}`}
            onClick={() => updateFilter('side', filters.side === 'LONG' ? '' : 'LONG')}
          >{t('tradeForm.long', 'Long')}</button>
          <button
            className={`filter-bar__side-btn filter-bar__side-btn--short ${filters.side === 'SHORT' ? 'filter-bar__side-btn--active' : ''}`}
            onClick={() => updateFilter('side', filters.side === 'SHORT' ? '' : 'SHORT')}
          >{t('tradeForm.short', 'Short')}</button>
        </div>

        {/* Expand toggle */}
        <button
          className={`filter-bar__expand-btn ${expanded ? 'filter-bar__expand-btn--active' : ''}`}
          onClick={() => setExpanded(!expanded)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          {t('filter.title', 'Bộ lọc')}
          {activeCount > 0 && <span className="filter-bar__badge">{activeCount}</span>}
        </button>

        {activeCount > 0 && (
          <button className="filter-bar__clear-btn" onClick={clearAll}>{t('filter.clearAll', 'Xóa tất cả')}</button>
        )}
      </div>

      {/* Expanded filter panel */}
      {expanded && (
        <div className="filter-bar__panel">
          <div className="filter-bar__row">
            <div className="filter-bar__group">
              <label className="filter-bar__label">{t('journal.table.pair', 'Cặp tiền')}</label>
              <select
                className="filter-bar__select"
                value={filters.instrument || ''}
                onChange={e => updateFilter('instrument', e.target.value)}
              >
                <option value="">{t('filter.all', 'Tất cả')}</option>
                {instruments.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div className="filter-bar__group">
              <label className="filter-bar__label">{t('layout.tags', 'Nhãn')}</label>
              <select
                className="filter-bar__select"
                value={filters.tag || ''}
                onChange={e => updateFilter('tag', e.target.value)}
              >
                <option value="">{t('filter.allTags', 'Tất cả nhãn')}</option>
                {tags.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-bar__group">
              <label className="filter-bar__label">{t('layout.playbooks', 'Chiến lược')}</label>
              <select
                className="filter-bar__select"
                value={filters.playbookId || ''}
                onChange={e => updateFilter('playbookId', e.target.value)}
              >
                <option value="">{t('filter.allPlaybooks', 'Tất cả chiến lược')}</option>
                {playbooks.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-bar__group">
              <label className="filter-bar__label">{t('filter.minRating', 'Đánh giá tối thiểu')}</label>
              <select
                className="filter-bar__select"
                value={filters.rating || ''}
                onChange={e => updateFilter('rating', e.target.value)}
              >
                <option value="">{t('filter.all', 'Tất cả')}</option>
                {[1,2,3,4,5].map(r => <option key={r} value={String(r)}>{'★'.repeat(r)}+</option>)}
              </select>
            </div>
          </div>

          <div className="filter-bar__row">
            <div className="filter-bar__group">
              <label className="filter-bar__label">{t('filter.dateFrom', 'Từ ngày')}</label>
              <input
                type="date"
                className="filter-bar__input"
                value={filters.dateFrom || ''}
                onChange={e => updateFilter('dateFrom', e.target.value)}
              />
            </div>
            <div className="filter-bar__group">
              <label className="filter-bar__label">{t('filter.dateTo', 'Đến ngày')}</label>
              <input
                type="date"
                className="filter-bar__input"
                value={filters.dateTo || ''}
                onChange={e => updateFilter('dateTo', e.target.value)}
              />
            </div>
            <div className="filter-bar__group">
              <label className="filter-bar__label">{t('filter.pnlMin', 'L/L tối thiểu ($)')}</label>
              <input
                type="number"
                className="filter-bar__input"
                placeholder="-∞"
                value={filters.pnlMin || ''}
                onChange={e => updateFilter('pnlMin', e.target.value)}
                step="any"
              />
            </div>
            <div className="filter-bar__group">
              <label className="filter-bar__label">{t('filter.pnlMax', 'L/L tối đa ($)')}</label>
              <input
                type="number"
                className="filter-bar__input"
                placeholder="+∞"
                value={filters.pnlMax || ''}
                onChange={e => updateFilter('pnlMax', e.target.value)}
                step="any"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
