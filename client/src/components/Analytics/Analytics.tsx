import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
  Area, AreaChart, Line, ComposedChart,
} from 'recharts';
import { analyticsApi, tradeApi, aiApi } from '../../services/api';
import { formatCurrencyShort } from '../../utils/calendarUtils';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { MOOD_OPTIONS } from '../../types';
import type {
  AnalyticsOverview, DayOfWeekData, InstrumentData, SideData,
  TagPerformance, PlaybookPerformance, MoodPerformance,
  StreakData, RiskData, RollingData, Trade,
} from '../../types';
import './Analytics.css';

// Date presets
const PRESETS = [
  { key: '7d', days: 7 },
  { key: '30d', days: 30 },
  { key: '90d', days: 90 },
  { key: 'ytd', days: -1 },
  { key: 'all', days: 0 },
];

function formatPnl(v: number, isBlindMode = false) {
  const sign = v > 0 && !isBlindMode ? '+' : '';
  return `${sign}${formatCurrencyShort(v, isBlindMode)}`;
}

function pnlClass(v: number) {
  return v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral';
}

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="db-tooltip">
      <div className="db-tooltip__label">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="db-tooltip__row">
          <span className="db-tooltip__dot" style={{ background: p.color || p.fill }} />
          <span className="db-tooltip__name">{p.name}</span>
          <span className={`db-tooltip__value db-tooltip__value--${pnlClass(Number(p.value))}`}>
            {formatter ? formatter(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { theme } = useTheme();
  const { isBlindMode } = useSettings();
  const { t } = useTranslation();
  const [preset, setPreset] = useState('all');
  
  // AI Coach state
  const [coachInsights, setCoachInsights] = useState<string>('');
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [dowData, setDowData] = useState<DayOfWeekData[]>([]);
  const [instrData, setInstrData] = useState<InstrumentData[]>([]);
  const [sideData, setSideData] = useState<SideData[]>([]);
  const [tagData, setTagData] = useState<TagPerformance[]>([]);
  const [pbData, setPbData] = useState<PlaybookPerformance[]>([]);
  const [moodData, setMoodData] = useState<MoodPerformance[]>([]);
  const [streaks, setStreaks] = useState<StreakData | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [rollingData, setRollingData] = useState<RollingData[]>([]);
  const [rawTrades, setRawTrades] = useState<Trade[]>([]);

  // Calculate date range from preset
  useEffect(() => {
    const p = PRESETS.find(pr => pr.key === preset);
    if (!p) return;
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (p.days === 0) { setDateFrom(undefined); setDateTo(undefined); }
    else if (p.days === -1) {
      setDateFrom(`${today.getFullYear()}-01-01`);
      setDateTo(todayStr);
    } else {
      const from = new Date(today);
      from.setDate(from.getDate() - p.days);
      setDateFrom(from.toISOString().slice(0, 10));
      setDateTo(todayStr);
    }
  }, [preset]);

  // Fetch all data
  useEffect(() => {
    const fetch = async () => {
      try {
        const [ov, dow, instr, side, tag, pb, mood, str, risk, rolling, raw] = await Promise.all([
          analyticsApi.overview(dateFrom, dateTo),
          analyticsApi.byDayOfWeek(dateFrom, dateTo),
          analyticsApi.byInstrument(dateFrom, dateTo),
          analyticsApi.bySide(dateFrom, dateTo),
          analyticsApi.byTag(dateFrom, dateTo),
          analyticsApi.byPlaybook(dateFrom, dateTo),
          analyticsApi.byMood(dateFrom, dateTo),
          analyticsApi.streaks(dateFrom, dateTo),
          analyticsApi.risk(dateFrom, dateTo),
          analyticsApi.rolling(30),
          tradeApi.getAll(undefined, undefined, { dateFrom, dateTo }),
        ]);
        setOverview(ov); setDowData(dow || []); setInstrData(instr || []);
        setSideData(side || []); setTagData(tag || []); setPbData(pb || []);
        setMoodData(mood || []); setStreaks(str); setRiskData(risk);
        setRollingData(rolling || []); setRawTrades(raw || []);
      } catch (err) { console.error('Analytics fetch error:', err); }
    };
    fetch();
  }, [dateFrom, dateTo]);

  const axisColor = theme === 'dark' ? '#484f58' : '#8b949e';
  const gridColor = theme === 'dark' ? 'rgba(48, 54, 61, 0.5)' : 'rgba(208, 215, 222, 0.5)';
  const profitColor = theme === 'dark' ? '#3fb950' : '#1a7f37';
  const lossColor = theme === 'dark' ? '#f85149' : '#cf222e';
  const accentBlue = theme === 'dark' ? '#58a6ff' : '#0969da';

  // Heatmap rendering
  const heatmapWeeks = useMemo(() => {
    if (!streaks?.heatmap?.length) return [];
    const days = streaks.heatmap;
    const maxAbs = Math.max(...days.map(d => Math.abs(d.pnl)), 1);

    const dayMap = new Map<string, { pnl: number, intensity: number }>();
    for (const d of days) {
      dayMap.set(d.date, { pnl: d.pnl, intensity: Math.min(Math.abs(d.pnl) / maxAbs, 1) });
    }

    const weeks: { date: string; pnl: number; intensity: number; dayOfWeek: number }[][] = [];
    let currentWeek: typeof weeks[0] = [];

    // Fill from first day to align weeks
    const firstDate = new Date(days[0].date + 'T00:00:00');
    const lastDate = new Date(days[days.length - 1].date + 'T00:00:00');
    
    const startDayOfWeek = firstDate.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push({ date: '', pnl: 0, intensity: 0, dayOfWeek: i });
    }

    let currentDate = new Date(firstDate);
    
    while (currentDate <= lastDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dow = currentDate.getDay();
      
      if (dow === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      const tradeData = dayMap.get(dateStr);
      currentWeek.push({
        date: dateStr,
        pnl: tradeData ? tradeData.pnl : 0,
        intensity: tradeData ? tradeData.intensity : 0,
        dayOfWeek: dow,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (currentWeek.length > 0) weeks.push(currentWeek);
    return weeks;
  }, [streaks]);

  /* ── Cumulative P/L (Equity Curve) ── */
  const cumulativePnlData = useMemo(() => {
    // Sort trades chronologically
    const sorted = [...rawTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cum = 0;
    const dailyMap: Record<string, number> = {};
    
    for (const t of sorted) {
      if (!dailyMap[t.date]) dailyMap[t.date] = 0;
      dailyMap[t.date] += t.pnl;
    }

    return Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, dailyPnl]) => {
      cum += dailyPnl;
      return { date: date.slice(5), cumPnl: parseFloat(cum.toFixed(2)) };
    });
  }, [rawTrades]);

  /* ── AI Insights ── */
  const aiInsights = useMemo(() => {
    const trades = rawTrades;
    if (trades.length < 3) return [t('analytics.ai.notEnoughData')];
    const insights: string[] = [];

    // 1. Long vs Short
    const longs = trades.filter(t => t.side === 'LONG');
    const shorts = trades.filter(t => t.side === 'SHORT');
    const longWinRate = longs.length > 0 ? longs.filter(t => t.pnl > 0).length / longs.length * 100 : 0;
    const shortWinRate = shorts.length > 0 ? shorts.filter(t => t.pnl > 0).length / shorts.length * 100 : 0;
    
    if (longWinRate > shortWinRate + 15 && longs.length > 2) {
      insights.push(`📈 Lệnh LONG của bạn đang hiệu quả hơn hẳn SHORT (${longWinRate.toFixed(0)}% vs ${shortWinRate.toFixed(0)}%).`);
    } else if (shortWinRate > longWinRate + 15 && shorts.length > 2) {
      insights.push(`📉 Lệnh SHORT của bạn đang hiệu quả hơn hẳn LONG (${shortWinRate.toFixed(0)}% vs ${longWinRate.toFixed(0)}%).`);
    }

    // 2. Day of Week
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const pnlByDay: Record<number, number> = {};
    trades.forEach(t => {
      const d = new Date(t.date).getDay();
      pnlByDay[d] = (pnlByDay[d] || 0) + t.pnl;
    });
    
    if (Object.keys(pnlByDay).length > 0) {
      const bestDay = Object.keys(pnlByDay).reduce((a, b) => pnlByDay[Number(a)] > pnlByDay[Number(b)] ? a : b, Object.keys(pnlByDay)[0]);
      const worstDay = Object.keys(pnlByDay).reduce((a, b) => pnlByDay[Number(a)] < pnlByDay[Number(b)] ? a : b, Object.keys(pnlByDay)[0]);

      if (pnlByDay[Number(bestDay)] > 0) {
        insights.push(`🌟 ${days[Number(bestDay)]} thường là ngày bạn giao dịch tốt nhất (${formatCurrencyShort(pnlByDay[Number(bestDay)], isBlindMode)}).`);
      }
      if (pnlByDay[Number(worstDay)] < 0 && bestDay !== worstDay) {
        insights.push(`⚠️ Nên cẩn thận vào ${days[Number(worstDay)]}, đây là ngày bạn hay thua lỗ nhất (${formatCurrencyShort(pnlByDay[Number(worstDay)], isBlindMode)}).`);
      }
    }

    // 3. Playbook performance
    const withPlan = trades.filter(t => !!t.playbookId);
    const noPlan = trades.filter(t => !t.playbookId);
    if (withPlan.length > 0 && noPlan.length > 0) {
      const planWinRate = withPlan.filter(t => t.pnl > 0).length / withPlan.length * 100;
      const noPlanWinRate = noPlan.filter(t => t.pnl > 0).length / noPlan.length * 100;
      if (planWinRate > noPlanWinRate + 10) {
        insights.push(`📋 Kỷ luật tốt! Đánh có Playbook mang lại Winrate ${planWinRate.toFixed(0)}% so với ${noPlanWinRate.toFixed(0)}% khi đánh bừa.`);
      } else if (noPlanWinRate > planWinRate + 10) {
        insights.push(`🤔 Hiện tại các lệnh đánh tự do có Winrate cao hơn lệnh có Playbook (${noPlanWinRate.toFixed(0)}% vs ${planWinRate.toFixed(0)}%). Hãy xem xét lại.`);
      }
    }
    
    if (insights.length === 0) {
      insights.push("💡 Thu thập thêm dữ liệu để AI có thể phân tích xu hướng của bạn rõ ràng hơn.");
    }

    return insights;
  }, [rawTrades]);

  const handleFetchCoach = async () => {
    if (loadingCoach) return;
    setLoadingCoach(true);
    try {
      const data = await aiApi.coach();
      setCoachInsights(data);
    } catch (e: any) {
      console.error('AI Coach fetch error:', e);
      setCoachInsights(t('analytics.ai.errorConn'));
    } finally {
      setLoadingCoach(false);
    }
  };

  // KPI Row Formatting update with isBlindMode
  const kpiData = overview ? [
    { label: t('analytics.kpi.winRate'), value: `${(overview.winRate ?? 0).toFixed(1)}%`, cls: pnlClass((overview.winRate ?? 0) >= 50 ? 1 : -1) },
    { label: t('analytics.kpi.profitFactor'), value: overview.profitFactor === -1 ? '∞' : (overview.profitFactor ?? 0).toFixed(2), cls: pnlClass((overview.profitFactor ?? 0) >= 1 || overview.profitFactor === -1 ? 1 : -1) },
    { label: t('analytics.kpi.expectancy'), value: formatPnl(overview.expectancy ?? 0, isBlindMode), cls: pnlClass(overview.expectancy ?? 0) },
    { label: t('analytics.kpi.sharpe'), value: overview.sharpeRatio === -1 ? '∞' : (overview.sharpeRatio ?? 0).toFixed(2), cls: pnlClass((overview.sharpeRatio ?? 0) > 0 || overview.sharpeRatio === -1 ? 1 : -1) },
    { label: t('analytics.kpi.maxDrawdown'), value: formatCurrencyShort(overview.maxDrawdown ?? 0, isBlindMode), cls: 'negative' },
    { label: t('analytics.kpi.avgRR'), value: (overview.avgRR ?? 0).toFixed(2), cls: pnlClass(overview.avgRR ?? 0) },
    { label: t('analytics.kpi.tradingDays'), value: String(overview.tradingDays ?? 0), cls: 'neutral' },
    { label: t('analytics.kpi.totalPnl'), value: formatPnl(overview.totalPnl ?? 0, isBlindMode), cls: pnlClass(overview.totalPnl ?? 0) },
  ] : [];

  if (!overview) return (
    <div className="analytics-page">
      <div className="analytics-loading"><div className="gallery-loading__spinner" /><p>{t('analytics.ai.loadingPage')}</p></div>
    </div>
  );

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1 className="analytics-header__title">{t('analytics.title')}</h1>
        <div className="analytics-header__presets">
          {PRESETS.map(p => (
            <button
              key={p.key}
              className={`analytics-preset-btn ${preset === p.key ? 'analytics-preset-btn--active' : ''}`}
              onClick={() => setPreset(p.key)}
            >{t(`analytics.presets.${p.key}`)}</button>
          ))}
        </div>
        <button
          className="btn btn--primary analytics-export-btn"
          onClick={async () => {
            if (exportingExcel) return;
            setExportingExcel(true);
            try {
              await analyticsApi.exportExcel(dateFrom, dateTo);
            } catch (e: any) {
              console.error('Export error:', e);
            } finally {
              setExportingExcel(false);
            }
          }}
          disabled={exportingExcel}
          id="export-excel-btn"
        >
          {exportingExcel ? '⏳' : '📊'} {t('analytics.exportExcel', 'Export Excel')}
        </button>
      </div>

      {/* KPI Row */}
      <div className="analytics-kpi-row">
        {kpiData.map(kpi => (
          <div key={kpi.label} className="analytics-kpi">
            <span className="analytics-kpi__label">{kpi.label}</span>
            <span className={`analytics-kpi__value analytics-kpi__value--${kpi.cls}`}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* AI Insights */}
      <div className="analytics-card analytics-card--wide" id="ai-insights" style={{ marginBottom: 16 }}>
        <h3 className="analytics-card__title" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18 }}>🤖</span>
            {t('analytics.ai.title')}
          </div>
          <button 
            className="btn btn--primary" 
            onClick={handleFetchCoach}
            disabled={loadingCoach}
            style={{ fontSize: 12, padding: '4px 12px' }}
          >
            {loadingCoach ? t('analytics.ai.loadingBtn') : t('analytics.ai.request')}
          </button>
        </h3>
        <div className="analytics-insights-list">
          {coachInsights ? (
            <div className="analytics-insight-item" style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {coachInsights}
            </div>
          ) : (
            aiInsights.map((insight, idx) => (
              <div key={idx} className="analytics-insight-item">
                {insight}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="analytics-grid">
        {/* Equity Curve */}
        {cumulativePnlData.length > 0 && (
          <div className="analytics-card analytics-card--wide" id="chart-equity-curve">
            <h3 className="analytics-card__title">{t('analytics.charts.equityCurve')}</h3>
            <div className="analytics-chart" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativePnlData} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="equityColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={accentBlue} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={accentBlue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<ChartTooltip formatter={(v: number) => formatPnl(v, isBlindMode)} />} />
                  <Area type="step" dataKey="cumPnl" stroke={accentBlue} fillOpacity={1} fill="url(#equityColor)" strokeWidth={2} name={t('analytics.common.cumPnl')} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* P/L by Day of Week */}
        <div className="analytics-card" id="chart-dow">
          <h3 className="analytics-card__title">{t('analytics.charts.dowPnl')}</h3>
          <div className="analytics-chart">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dowData.filter(d => d.trades > 0)} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(0, 3)} />
                <YAxis tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => formatPnl(v)} />} />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={40} name="P/L">
                  {dowData.filter(d => d.trades > 0).map((entry, idx) => (
                    <Cell key={idx} fill={entry.pnl >= 0 ? profitColor : lossColor} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LONG vs SHORT */}
        <div className="analytics-card" id="chart-side">
          <h3 className="analytics-card__title">{t('analytics.charts.longVsShort')}</h3>
          <div className="analytics-side-compare">
            {sideData.map(s => (
              <div key={s.side} className={`analytics-side-card analytics-side-card--${s.side.toLowerCase()}`}>
                <span className="analytics-side-card__label">{s.side}</span>
                <span className="analytics-side-card__trades">{s.trades} {t('analytics.common.trades')}</span>
                <span className={`analytics-side-card__pnl ${pnlClass(s.pnl)}`}>{formatPnl(s.pnl, isBlindMode)}</span>
                <span className="analytics-side-card__wr">{t('analytics.common.rate')}{s.winRate.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rolling P/L */}
        {rollingData.length > 0 && (
          <div className="analytics-card analytics-card--wide" id="chart-rolling">
            <h3 className="analytics-card__title">{t('analytics.charts.rollingPnl')}</h3>
            <div className="analytics-chart" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rollingData} margin={{ top: 10, right: 12, left: -8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={gridColor} vertical={false} opacity={0.6} />
                  <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} dy={4} />
                  <YAxis tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrencyShort(v)} />
                  <Tooltip content={<ChartTooltip formatter={(v: number) => formatPnl(v, isBlindMode)} />} cursor={{ fill: 'var(--text-muted)', opacity: 0.1 }} />
                  
                  <Bar dataKey="dayPnl" name={t('analytics.common.dayPnl')} radius={[2, 2, 2, 2]} maxBarSize={30}>
                    {rollingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.dayPnl >= 0 ? profitColor : lossColor} fillOpacity={0.7} />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="rollingAvg" stroke={accentBlue} strokeWidth={3} dot={false} activeDot={{ r: 6, fill: accentBlue }} name={t('analytics.common.rolling30d')} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Drawdown */}
        {riskData && riskData.drawdownCurve.length > 0 && (
          <div className="analytics-card analytics-card--wide" id="chart-drawdown">
            <h3 className="analytics-card__title">{t('analytics.charts.drawdownCurve')}</h3>
            <div className="analytics-chart" style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskData.drawdownCurve} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lossColor} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={lossColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<ChartTooltip formatter={(v: number) => formatCurrencyShort(v, isBlindMode)} />} />
                  <Area type="monotone" dataKey="drawdown" stroke={lossColor} fill="url(#ddGrad)" strokeWidth={2} name={t('analytics.common.drawdown')} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Instrument breakdown */}
        {instrData.length > 0 && (
          <div className="analytics-card analytics-card--wide" id="table-instrument">
            <h3 className="analytics-card__title">{t('analytics.tables.instrument')}</h3>
            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead><tr><th>{t('analytics.tables.colInstrument')}</th><th>{t('analytics.tables.colTrades')}</th><th>{t('analytics.tables.colWinRate')}</th><th>{t('analytics.tables.colAvgPnl')}</th><th>{t('analytics.tables.colTotalPnl')}</th></tr></thead>
                <tbody>
                  {instrData.map(row => (
                    <tr key={row.instrument}>
                      <td className="analytics-table__name">{row.instrument}</td>
                      <td>{row.trades}</td>
                      <td>{row.winRate.toFixed(0)}%</td>
                      <td className={pnlClass(row.avgPnl)}>{formatPnl(row.avgPnl, isBlindMode)}</td>
                      <td className={pnlClass(row.pnl)}>{formatPnl(row.pnl, isBlindMode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tag performance */}
        {tagData.length > 0 && (
          <div className="analytics-card" id="table-tag">
            <h3 className="analytics-card__title">{t('analytics.tables.tag')}</h3>
            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead><tr><th>{t('analytics.tables.colTag')}</th><th>{t('analytics.tables.colTrades')}</th><th>{t('analytics.tables.colWinRate')}</th><th>L/L</th></tr></thead>
                <tbody>
                  {tagData.map(row => (
                    <tr key={row.tag}>
                      <td className="analytics-table__name">{row.tag}</td>
                      <td>{row.trades}</td>
                      <td>{row.winRate.toFixed(0)}%</td>
                      <td className={pnlClass(row.pnl)}>{formatPnl(row.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Playbook performance */}
        {pbData.length > 0 && (
          <div className="analytics-card" id="table-playbook">
            <h3 className="analytics-card__title">{t('analytics.tables.playbook')}</h3>
            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead><tr><th>{t('analytics.tables.colPlaybook')}</th><th>{t('analytics.tables.colTrades')}</th><th>{t('analytics.tables.colWinRate')}</th><th>L/L</th></tr></thead>
                <tbody>
                  {pbData.map(row => (
                    <tr key={row.playbookId}>
                      <td className="analytics-table__name">
                        <span className="playbook-card__dot" style={{ background: row.color, width: 8, height: 8, display: 'inline-block', borderRadius: '50%', marginRight: 6 }} />
                        {row.name}
                      </td>
                      <td>{row.trades}</td>
                      <td>{row.winRate.toFixed(0)}%</td>
                      <td className={pnlClass(row.pnl)}>{formatPnl(row.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mood Correlation */}
        {moodData.length > 0 && (
          <div className="analytics-card analytics-card--wide" id="mood-correlation">
            <h3 className="analytics-card__title">{t('analytics.tables.mood')}</h3>
            <div className="mood-correlation-grid">
              {moodData.map(m => {
                const moodOpt = MOOD_OPTIONS.find(o => o.value === m.mood);
                return (
                  <div key={m.mood} className="mood-correlation-card">
                    <span className="mood-correlation-card__emoji">{moodOpt?.emoji || '😐'}</span>
                    <span className="mood-correlation-card__label">{moodOpt?.label || m.mood}</span>
                    <span className="mood-correlation-card__days">{m.days} {t('analytics.common.day')}</span>
                    <span className={`mood-correlation-card__pnl ${pnlClass(m.avgPnlPerDay)}`}>
                      {formatPnl(m.avgPnlPerDay, isBlindMode)}{t('analytics.common.perDay')}
                    </span>
                    <span className="mood-correlation-card__wr">{t('analytics.common.rate')}{m.winRate.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Heatmap */}
        {heatmapWeeks.length > 0 && (
          <div className="analytics-card analytics-card--wide" id="heatmap">
            <h3 className="analytics-card__title">{t('analytics.charts.heatmap')}</h3>
            <div className="heatmap-container">
              <div className="heatmap-labels">
                {[t('analytics.days.sun'), t('analytics.days.mon'), t('analytics.days.tue'), t('analytics.days.wed'), t('analytics.days.thu'), t('analytics.days.fri'), t('analytics.days.sat')].map((d, i) => (
                  <span key={i} className="heatmap-label">{d}</span>
                ))}
              </div>
              <div className="heatmap-grid">
                {heatmapWeeks.map((week, wi) => (
                  <div key={wi} className="heatmap-week">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        className={`heatmap-cell ${!day.date ? 'heatmap-cell--empty' : ''}`}
                        style={day.date ? {
                          backgroundColor: day.pnl > 0
                            ? `rgba(63, 185, 80, ${0.2 + day.intensity * 0.6})`
                            : day.pnl < 0
                            ? `rgba(248, 81, 73, ${0.2 + day.intensity * 0.6})`
                            : 'var(--border-primary)',
                        } : undefined}
                        title={day.date ? `${day.date}: ${formatPnl(day.pnl, isBlindMode)}` : ''}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="heatmap-legend">
                <span>{t('analytics.common.less')}</span>
                <div className="heatmap-cell" style={{ backgroundColor: 'rgba(248, 81, 73, 0.6)' }} />
                <div className="heatmap-cell" style={{ backgroundColor: 'rgba(248, 81, 73, 0.3)' }} />
                <div className="heatmap-cell" style={{ backgroundColor: 'var(--border-primary)' }} />
                <div className="heatmap-cell" style={{ backgroundColor: 'rgba(63, 185, 80, 0.3)' }} />
                <div className="heatmap-cell" style={{ backgroundColor: 'rgba(63, 185, 80, 0.6)' }} />
                <span>{t('analytics.common.more')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Streak cards */}
        {streaks && (
          <div className="analytics-card" id="streaks">
            <h3 className="analytics-card__title">{t('analytics.streaks.title')}</h3>
            <div className="streak-cards">
              <div className="streak-card">
                <span className="streak-card__label">{t('analytics.streaks.current')}</span>
                <span className={`streak-card__value ${pnlClass(streaks.currentStreak)}`}>
                  {streaks.currentStreak > 0 ? `${streaks.currentStreak} 🔥` : streaks.currentStreak < 0 ? `${Math.abs(streaks.currentStreak)}` : '—'}
                </span>
              </div>
              <div className="streak-card">
                <span className="streak-card__label">{t('analytics.streaks.maxWin')}</span>
                <span className="streak-card__value positive">{streaks.maxWinStreak}</span>
              </div>
              <div className="streak-card">
                <span className="streak-card__label">{t('analytics.streaks.maxLoss')}</span>
                <span className="streak-card__value negative">{streaks.maxLossStreak}</span>
              </div>
            </div>
          </div>
        )}

        {/* Risk R:R */}
        {riskData && (
          <div className="analytics-card" id="risk-rr">
            <h3 className="analytics-card__title">{t('analytics.risk.title')}</h3>
            <div className="analytics-details">
              <div className="detail-row">
                <span className="detail-row__label">{t('analytics.risk.tradesSl')}</span>
                <span className="detail-row__value">{riskData.tradesWithSL}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row__label">{t('analytics.risk.tradesTp')}</span>
                <span className="detail-row__value">{riskData.tradesWithTP}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row__label">{t('analytics.risk.avgRr')}</span>
                <span className={`detail-row__value ${pnlClass(riskData.avgRR)}`}>{riskData.avgRR.toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row__label">{t('analytics.risk.tpHitRate')}</span>
                <span className="detail-row__value">{riskData.tpHitRate.toFixed(0)}%</span>
              </div>
              <div className="detail-row">
                <span className="detail-row__label">{t('analytics.risk.slHitRate')}</span>
                <span className="detail-row__value">{riskData.slHitRate.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
