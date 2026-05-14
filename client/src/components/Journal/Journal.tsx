import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { journalApi, tradeApi } from '../../services/api';
import { formatCurrencyShort } from '../../utils/calendarUtils';
import { useSettings } from '../../context/SettingsContext';
import type { JournalEntry, Trade } from '../../types';
import TiltModeOverlay from './TiltModeOverlay';
import './Journal.css';

export default function Journal() {
  const { t, i18n } = useTranslation();
  const { isBlindMode, maxDailyLoss } = useSettings();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    content: '',
    mood: 'neutral' as string,
    preMarketNotes: '',
    postMarketNotes: '',
    marketCondition: '' as string,
  });

  const monthNames = useMemo(() => [
    t('calendar.months.1', 'Th01'), t('calendar.months.2', 'Th02'), t('calendar.months.3', 'Th03'),
    t('calendar.months.4', 'Th04'), t('calendar.months.5', 'Th05'), t('calendar.months.6', 'Th06'),
    t('calendar.months.7', 'Th07'), t('calendar.months.8', 'Th08'), t('calendar.months.9', 'Th09'),
    t('calendar.months.10', 'Th10'), t('calendar.months.11', 'Th11'), t('calendar.months.12', 'Th12')
  ], [t]);

  const moodOptions = useMemo(() => [
    { value: 'frustrated', emoji: '😤', label: t('journal.moodOptions.frustrated', 'Bực bội') },
    { value: 'anxious', emoji: '😰', label: t('journal.moodOptions.anxious', 'Lo lắng') },
    { value: 'neutral', emoji: '😐', label: t('journal.moodOptions.neutral', 'Bình thường') },
    { value: 'confident', emoji: '😊', label: t('journal.moodOptions.confident', 'Tự tin') },
    { value: 'in_the_zone', emoji: '🔥', label: t('journal.moodOptions.focused', 'Cực kỳ tập trung') },
  ], [t]);

  const marketConditions = useMemo(() => [
    { value: '', label: t('journal.marketOptions.none', 'Chưa đặt') },
    { value: 'trending', label: `📈 ${t('journal.marketOptions.trending', 'Xu hướng')}` },
    { value: 'ranging', label: `↔️ ${t('journal.marketOptions.ranging', 'Sideway')}` },
    { value: 'choppy', label: `🌊 ${t('journal.marketOptions.choppy', 'Nhiễu')}` },
    { value: 'high_volatility', label: `⚡ ${t('journal.marketOptions.high_vol', 'Biến động cao')}` },
    { value: 'low_volatility', label: `😴 ${t('journal.marketOptions.low_vol', 'Biến động thấp')}` },
  ], [t]);

  const fetchData = useCallback(async () => {
    try {
      const [j, t] = await Promise.all([
        journalApi.getAll(year, month),
        tradeApi.getAll(year, month),
      ]);
      setEntries(j);
      setTrades(t);
    } catch (err) { console.error(err); }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load entry for selected date
  useEffect(() => {
    const entry = entries.find(e => e.date === selectedDate);
    setCurrentEntry(entry || null);
    setForm({
      content: entry?.content || '',
      mood: entry?.mood || 'neutral',
      preMarketNotes: entry?.preMarketNotes || '',
      postMarketNotes: entry?.postMarketNotes || '',
      marketCondition: entry?.marketCondition || '',
    });
  }, [selectedDate, entries]);

  const dayTrades = trades.filter(t => t.date === selectedDate);
  const dayPnl = dayTrades.reduce((s, t) => s + (t.pnl - (t.fees || 0)), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await journalApi.save({ date: selectedDate, ...form });
      await fetchData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const todayTrades = trades.filter(t => t.date === todayStr);
  const todayPnl = todayTrades.reduce((s,t) => s + (t.pnl - (t.fees||0)), 0);
  const showTiltMode = todayPnl < -(maxDailyLoss || 500);

  const handlePrev = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const handleNext = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  // Build day list for the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayList = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = entries.find(e => e.date === dateStr);
    const dayT = trades.filter(t => t.date === dateStr);
    const pnl = dayT.reduce((s, t) => s + (t.pnl - (t.fees || 0)), 0);
    return { day, dateStr, entry, tradeCount: dayT.length, pnl };
  });

  const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(i18n.language || 'vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="journal-page">
      {showTiltMode && <TiltModeOverlay maxDailyLoss={maxDailyLoss} currentLoss={todayPnl} />}
      <div className="journal-page__header">
        <h1 className="journal-page__title">📓 {t('journal.title')}</h1>
        <div className="journal-page__nav">
          <button className="db__nav-btn" onClick={handlePrev}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="journal-page__period">{monthNames[month - 1]} {year}</span>
          <button className="db__nav-btn" onClick={handleNext}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <div className="journal-layout">
        {/* Day list sidebar */}
        <div className="journal-sidebar">
          <div className="journal-day-list">
            {dayList.map(d => (
              <div
                key={d.day}
                className={`journal-day-item ${d.dateStr === selectedDate ? 'journal-day-item--active' : ''} ${d.entry ? 'journal-day-item--has-entry' : ''}`}
                onClick={() => setSelectedDate(d.dateStr)}
              >
                <div className="journal-day-item__date">
                  <span className="journal-day-item__num">{d.day}</span>
                  {d.entry && (
                    <span className="journal-day-item__mood">
                      {moodOptions.find(m => m.value === d.entry?.mood)?.emoji || '😐'}
                    </span>
                  )}
                </div>
                {d.tradeCount > 0 && (
                  <div className="journal-day-item__meta">
                    <span className="journal-day-item__trades">{d.tradeCount} {t('calendar.trades', 'lệnh')}</span>
                    <span className={`journal-day-item__pnl ${d.pnl > 0 ? 'positive' : d.pnl < 0 ? 'negative' : ''}`}>
                      {d.pnl > 0 && !isBlindMode ? '+' : ''}{formatCurrencyShort(d.pnl, isBlindMode)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Editor main */}
        <div className="journal-editor">
          <div className="journal-editor__header">
            <h2 className="journal-editor__date">{formattedDate}</h2>
            <div className="journal-editor__status">
              {currentEntry && <span className="journal-editor__saved-badge">✓ {t('journal.saved', 'Đã lưu')}</span>}
            </div>
          </div>

          {/* Mood selector */}
          <div className="journal-section">
            <label className="journal-section__label">{t('journal.mood', 'Tâm trạng')}</label>
            <div className="mood-selector">
              {moodOptions.map(m => (
                <button
                  key={m.value}
                  className={`mood-btn ${form.mood === m.value ? 'mood-btn--active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, mood: m.value }))}
                  title={m.label}
                >
                  <span className="mood-btn__emoji">{m.emoji}</span>
                  <span className="mood-btn__label">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Market condition */}
          <div className="journal-section">
            <label className="journal-section__label">{t('journal.marketCondition', 'Điều kiện thị trường')}</label>
            <div className="market-condition-selector">
              {marketConditions.map(mc => (
                <button
                  key={mc.value}
                  className={`market-btn ${form.marketCondition === mc.value ? 'market-btn--active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, marketCondition: mc.value }))}
                >
                  {mc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pre-market notes */}
          <div className="journal-section">
            <label className="journal-section__label">🌅 {t('journal.preMarket', 'Ghi chú trước phiên')}</label>
            <textarea
              className="journal-textarea journal-textarea--sm"
              placeholder={t('journal.preMarketPlaceholder', 'Kế hoạch hôm nay? Triển vọng thị trường? Mức giá quan trọng?')}
              value={form.preMarketNotes}
              onChange={e => setForm(f => ({ ...f, preMarketNotes: e.target.value }))}
            />
          </div>

          {/* Main journal content */}
          <div className="journal-section">
            <label className="journal-section__label">📝 {t('journal.mainEntry', 'Nhật ký ngày')}</label>
            <textarea
              className="journal-textarea journal-textarea--lg"
              placeholder={t('journal.mainPlaceholder', 'Viết về ngày giao dịch của bạn...')}
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            />
          </div>

          {/* Post-market notes */}
          <div className="journal-section">
            <label className="journal-section__label">🌙 {t('journal.postMarket', 'Đánh giá sau phiên')}</label>
            <textarea
              className="journal-textarea journal-textarea--sm"
              placeholder={t('journal.postMarketPlaceholder', 'Điều gì tốt? Cần cải thiện gì? Bài học rút ra?')}
              value={form.postMarketNotes}
              onChange={e => setForm(f => ({ ...f, postMarketNotes: e.target.value }))}
            />
          </div>

          {/* Day's trades */}
          {dayTrades.length > 0 && (
            <div className="journal-section">
              <label className="journal-section__label">
                📊 {t('journal.dayTrades', 'Lệnh trong ngày')} ({dayTrades.length})
                <span className={`journal-section__pnl ${dayPnl > 0 ? 'positive' : dayPnl < 0 ? 'negative' : ''}`}>
                  {dayPnl > 0 && !isBlindMode ? '+' : ''}{formatCurrencyShort(dayPnl, isBlindMode)}
                </span>
              </label>
              <div className="journal-trades-list">
                {dayTrades.map(t => (
                  <div key={t.id} className="journal-trade-card">
                    <span className="journal-trade-card__instrument">{t.instrument}</span>
                    <span className={`journal-trade-card__side journal-trade-card__side--${t.side.toLowerCase()}`}>{t.side}</span>
                    <span className={`journal-trade-card__pnl ${(t.pnl - (t.fees || 0)) > 0 ? 'positive' : (t.pnl - (t.fees || 0)) < 0 ? 'negative' : ''}`}>
                      {(t.pnl - (t.fees || 0)) > 0 && !isBlindMode ? '+' : ''}{formatCurrencyShort(t.pnl - (t.fees || 0), isBlindMode)}
                    </span>
                    {t.rating > 0 && <span className="journal-trade-card__rating">{'★'.repeat(t.rating)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save button */}
          <div className="journal-editor__actions">
            <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? '...' : currentEntry ? `💾 ${t('journal.update', 'Cập nhật')}` : `💾 ${t('journal.save', 'Lưu nhật ký')}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
