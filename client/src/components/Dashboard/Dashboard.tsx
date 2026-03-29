import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  Area, AreaChart, Legend,
} from 'recharts';
import { tradeApi } from '../../services/api';
import {
  formatCurrencyShort,
  getMonthNameShort,
  aggregateByDay,
} from '../../utils/calendarUtils';
import { useTheme } from '../../context/ThemeContext';
import type { Trade } from '../../types';
import './Dashboard.css';

/* ── helpers ── */
function pnlClass(v: number) {
  if (v > 0) return 'positive';
  if (v < 0) return 'negative';
  return 'neutral';
}

function formatPnl(v: number) {
  const sign = v > 0 ? '+' : '';
  return `${sign}${formatCurrencyShort(v)}`;
}

function calculateStreak(dailyData: { pnl: number }[]) {
  let currentStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let tempWin = 0;
  let tempLoss = 0;

  for (const d of dailyData) {
    if (d.pnl > 0) {
      tempWin++;
      tempLoss = 0;
      if (tempWin > maxWinStreak) maxWinStreak = tempWin;
    } else if (d.pnl < 0) {
      tempLoss++;
      tempWin = 0;
      if (tempLoss > maxLossStreak) maxLossStreak = tempLoss;
    } else {
      tempWin = 0;
      tempLoss = 0;
    }
  }

  // Current streak from end
  if (dailyData.length > 0) {
    const last = dailyData[dailyData.length - 1];
    if (last.pnl > 0) {
      currentStreak = 0;
      for (let i = dailyData.length - 1; i >= 0; i--) {
        if (dailyData[i].pnl > 0) currentStreak++;
        else break;
      }
    } else if (last.pnl < 0) {
      currentStreak = 0;
      for (let i = dailyData.length - 1; i >= 0; i--) {
        if (dailyData[i].pnl < 0) currentStreak--;
        else break;
      }
    }
  }

  return { currentStreak, maxWinStreak, maxLossStreak };
}

/* ── Custom Tooltip ── */
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

/* ── Donut Center Label ── */
function DonutCenterLabel({ viewBox, value, label }: any) {
  const { cx, cy } = viewBox;
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" className="donut-center__value">
        {value}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="donut-center__label">
        {label}
      </text>
    </g>
  );
}

/* ══════════════════════════ DASHBOARD ══════════════════════════ */
export default function Dashboard() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [, setLoading] = useState(true);
  const { theme } = useTheme();

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tradeApi.getAll(year, month);
      setTrades(data);
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const handlePrev = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const handleNext = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  /* ── Computed Stats ── */
  const stats = useMemo(() => {
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
    const totalFees = trades.reduce((s, t) => s + t.fees, 0);
    const winners = trades.filter(t => t.pnl > 0);
    const losers = trades.filter(t => t.pnl < 0);
    const breakeven = trades.filter(t => t.pnl === 0);
    const winRate = trades.length > 0 ? (winners.length / trades.length * 100) : 0;
    const grossProfit = winners.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losers.reduce((s, t) => s + t.pnl, 0));
    const avgWin = winners.length > 0 ? grossProfit / winners.length : 0;
    const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const avgPnl = trades.length > 0 ? totalPnl / trades.length : 0;
    const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.pnl)) : 0;
    const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.pnl)) : 0;

    const dayMap = aggregateByDay(trades);
    const winDays = Object.values(dayMap).filter(d => d.totalPnl > 0).length;
    const lossDays = Object.values(dayMap).filter(d => d.totalPnl < 0).length;
    const totalDays = Object.keys(dayMap).length;

    return {
      totalPnl, totalFees, totalTrades: trades.length,
      winners: winners.length, losers: losers.length, breakeven: breakeven.length,
      winRate, avgWin, avgLoss, profitFactor, avgPnl,
      grossProfit, grossLoss,
      bestTrade, worstTrade,
      winDays, lossDays, totalDays,
    };
  }, [trades]);

  /* ── Daily P/L chart data ── */
  const dailyPnlData = useMemo(() => {
    const dayMap = aggregateByDay(trades);
    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date: date.slice(5),
        pnl: parseFloat(d.totalPnl.toFixed(2)),
        trades: d.tradeCount,
      }));
  }, [trades]);

  /* ── Cumulative P/L ── */
  const cumulativePnlData = useMemo(() => {
    let cum = 0;
    return dailyPnlData.map(d => {
      cum += d.pnl;
      return { date: d.date, cumPnl: parseFloat(cum.toFixed(2)) };
    });
  }, [dailyPnlData]);

  /* ── Streaks ── */
  const streaks = useMemo(() => calculateStreak(dailyPnlData), [dailyPnlData]);

  /* ── Instrument breakdown ── */
  const instrumentData = useMemo(() => {
    const map: Record<string, { trades: number; pnl: number; wins: number }> = {};
    for (const t of trades) {
      if (!map[t.instrument]) map[t.instrument] = { trades: 0, pnl: 0, wins: 0 };
      map[t.instrument].trades++;
      map[t.instrument].pnl += t.pnl;
      if (t.pnl > 0) map[t.instrument].wins++;
    }
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        trades: d.trades,
        pnl: d.pnl,
        winRate: d.trades > 0 ? (d.wins / d.trades * 100) : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  /* ── Pie data ── */
  const pieData = useMemo(() => {
    const items = [
      { name: 'Won', value: stats.winners, color: 'var(--profit-color)' },
      { name: 'Lost', value: stats.losers, color: 'var(--loss-color)' },
    ];
    if (stats.breakeven > 0) {
      items.push({ name: 'BE', value: stats.breakeven, color: 'var(--text-muted)' });
    }
    return items;
  }, [stats]);

  /* ── Chart Colors ── */
  const axisColor = theme === 'dark' ? '#484f58' : '#8b949e';
  const gridColor = theme === 'dark' ? 'rgba(48, 54, 61, 0.5)' : 'rgba(208, 215, 222, 0.5)';
  const profitColor = theme === 'dark' ? '#3fb950' : '#1a7f37';
  const lossColor = theme === 'dark' ? '#f85149' : '#cf222e';

  return (
    <div className="db">
      {/* ── Header ── */}
      <div className="db__header">
        <div className="db__header-left">
          <h1 className="db__title">Performance</h1>
          <div className="db__period-nav">
            <button className="db__nav-btn" onClick={handlePrev} id="db-prev-month">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="db__period-label">{getMonthNameShort(month)} {year}</span>
            <button className="db__nav-btn" onClick={handleNext} id="db-next-month">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
        <div className="db__header-right">
          <div className={`db__hero-pnl db__hero-pnl--${pnlClass(stats.totalPnl)}`}>
            {formatPnl(stats.totalPnl)}
          </div>
          <div className="db__hero-sub">
            Net P/L · {stats.totalTrades} trades · {stats.totalDays} days
          </div>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="db__kpi-strip">
        <div className="kpi">
          <div className="kpi__icon kpi__icon--blue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="kpi__content">
            <span className="kpi__label">Win Rate</span>
            <span className={`kpi__value kpi__value--${stats.winRate >= 50 ? 'positive' : 'negative'}`}>
              {stats.winRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="kpi">
          <div className="kpi__icon kpi__icon--green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="kpi__content">
            <span className="kpi__label">Avg Win</span>
            <span className="kpi__value kpi__value--positive">{formatCurrencyShort(stats.avgWin)}</span>
          </div>
        </div>

        <div className="kpi">
          <div className="kpi__icon kpi__icon--red">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="kpi__content">
            <span className="kpi__label">Avg Loss</span>
            <span className="kpi__value kpi__value--negative">{formatCurrencyShort(stats.avgLoss)}</span>
          </div>
        </div>

        <div className="kpi">
          <div className="kpi__icon kpi__icon--purple">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div className="kpi__content">
            <span className="kpi__label">Profit Factor</span>
            <span className={`kpi__value kpi__value--${stats.profitFactor >= 1 ? 'positive' : 'negative'}`}>
              {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="kpi">
          <div className="kpi__icon kpi__icon--orange">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div className="kpi__content">
            <span className="kpi__label">Fees</span>
            <span className="kpi__value">{formatCurrencyShort(stats.totalFees)}</span>
          </div>
        </div>

        <div className="kpi">
          <div className="kpi__icon kpi__icon--cyan">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div className="kpi__content">
            <span className="kpi__label">Avg P/L</span>
            <span className={`kpi__value kpi__value--${pnlClass(stats.avgPnl)}`}>
              {formatPnl(stats.avgPnl)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="db__grid">
        {/* Daily P/L Chart */}
        <div className="db__card db__card--wide" id="chart-daily-pnl">
          <div className="db__card-header">
            <h3 className="db__card-title">Daily P/L</h3>
            <span className="db__card-badge">
              {stats.winDays}W / {stats.lossDays}L days
            </span>
          </div>
          <div className="db__chart db__chart--bar">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyPnlData} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  content={<ChartTooltip formatter={(v: number) => formatPnl(v)} />}
                  cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={32} name="P/L">
                  {dailyPnlData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.pnl >= 0 ? profitColor : lossColor} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Equity Curve */}
        <div className="db__card db__card--wide" id="chart-equity-curve">
          <div className="db__card-header">
            <h3 className="db__card-title">Equity Curve</h3>
            <span className={`db__card-badge db__card-badge--${pnlClass(cumulativePnlData[cumulativePnlData.length - 1]?.cumPnl ?? 0)}`}>
              {formatPnl(cumulativePnlData[cumulativePnlData.length - 1]?.cumPnl ?? 0)}
            </span>
          </div>
          <div className="db__chart db__chart--area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativePnlData} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={profitColor} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={profitColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  content={<ChartTooltip formatter={(v: number) => formatPnl(v)} />}
                  cursor={{ stroke: axisColor, strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey="cumPnl"
                  stroke={profitColor}
                  strokeWidth={2}
                  fill="url(#eqGrad)"
                  name="Cumulative"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: profitColor }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Loss Donut */}
        <div className="db__card" id="chart-winloss">
          <div className="db__card-header">
            <h3 className="db__card-title">Win / Loss</h3>
          </div>
          <div className="db__chart db__chart--donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="82%"
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="db-tooltip">
                        <div className="db-tooltip__row">
                          <span className="db-tooltip__dot" style={{ background: d.color }} />
                          <span className="db-tooltip__name">{d.name}</span>
                          <span className="db-tooltip__value">{d.value}</span>
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text overlay */}
            <div className="donut-overlay">
              <span className={`donut-overlay__value donut-overlay__value--${pnlClass(stats.winRate >= 50 ? 1 : -1)}`}>
                {stats.winRate.toFixed(0)}%
              </span>
              <span className="donut-overlay__label">Win Rate</span>
            </div>
          </div>
          {/* Legend under donut */}
          <div className="donut-legend">
            <div className="donut-legend__item">
              <span className="donut-legend__dot donut-legend__dot--win" />
              <span>{stats.winners} Won</span>
            </div>
            <div className="donut-legend__item">
              <span className="donut-legend__dot donut-legend__dot--loss" />
              <span>{stats.losers} Lost</span>
            </div>
            {stats.breakeven > 0 && (
              <div className="donut-legend__item">
                <span className="donut-legend__dot donut-legend__dot--be" />
                <span>{stats.breakeven} BE</span>
              </div>
            )}
          </div>
        </div>

        {/* Performance Details */}
        <div className="db__card" id="performance-details">
          <div className="db__card-header">
            <h3 className="db__card-title">Details</h3>
          </div>
          <div className="db__details">
            <div className="detail-row">
              <span className="detail-row__label">Gross Profit</span>
              <span className="detail-row__value detail-row__value--positive">{formatPnl(stats.grossProfit)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Gross Loss</span>
              <span className="detail-row__value detail-row__value--negative">-{formatCurrencyShort(stats.grossLoss)}</span>
            </div>
            <div className="detail-row detail-row--separator">
              <span className="detail-row__label">Best Trade</span>
              <span className={`detail-row__value detail-row__value--${pnlClass(stats.bestTrade)}`}>{formatPnl(stats.bestTrade)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Worst Trade</span>
              <span className={`detail-row__value detail-row__value--${pnlClass(stats.worstTrade)}`}>{formatPnl(stats.worstTrade)}</span>
            </div>
            <div className="detail-row detail-row--separator">
              <span className="detail-row__label">Current Streak</span>
              <span className={`detail-row__value detail-row__value--${pnlClass(streaks.currentStreak)}`}>
                {streaks.currentStreak > 0 ? `${streaks.currentStreak}W 🔥` : streaks.currentStreak < 0 ? `${Math.abs(streaks.currentStreak)}L` : '—'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Max Win Streak</span>
              <span className="detail-row__value detail-row__value--positive">{streaks.maxWinStreak || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Max Loss Streak</span>
              <span className="detail-row__value detail-row__value--negative">{streaks.maxLossStreak || '—'}</span>
            </div>
            <div className="detail-row detail-row--separator">
              <span className="detail-row__label">Win Days</span>
              <span className="detail-row__value">{stats.winDays} / {stats.totalDays}</span>
            </div>
          </div>
        </div>

        {/* Instrument Breakdown */}
        {instrumentData.length > 0 && (
          <div className="db__card db__card--wide" id="instrument-breakdown">
            <div className="db__card-header">
              <h3 className="db__card-title">Instrument Breakdown</h3>
            </div>
            <div className="db__table-wrap">
              <table className="db__table">
                <thead>
                  <tr>
                    <th>Instrument</th>
                    <th>Trades</th>
                    <th>Win Rate</th>
                    <th>P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {instrumentData.map(row => (
                    <tr key={row.name}>
                      <td className="db__table-instrument">{row.name}</td>
                      <td>{row.trades}</td>
                      <td>
                        <div className="db__table-wr">
                          <div className="db__table-wr-bar">
                            <div className="db__table-wr-fill" style={{ width: `${row.winRate}%` }} />
                          </div>
                          <span>{row.winRate.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className={`db__table-pnl db__table-pnl--${pnlClass(row.pnl)}`}>
                        {formatPnl(row.pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {trades.length === 0 && (
        <div className="db__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="db__empty-icon">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
          </svg>
          <p>No trades for {getMonthNameShort(month)} {year}</p>
          <span>Add trades from the Calendar to see your performance data</span>
        </div>
      )}
    </div>
  );
}
