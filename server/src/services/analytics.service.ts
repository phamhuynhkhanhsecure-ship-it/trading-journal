import type { IAnalyticsService } from '../interfaces/analytics.interfaces.js';
import type { ITradeRepository } from '../interfaces/trade.interfaces.js';
import type { IJournalRepository } from '../interfaces/journal.interfaces.js';
import type { IPlaybookRepository } from '../interfaces/playbook.interfaces.js';
import type { DateRangeFilter } from '../types.js';

/**
 * Analytics service — all analytics calculations.
 * SRP: only analytics computations, no DB access logic (delegated to repos).
 */
export class AnalyticsService implements IAnalyticsService {
  constructor(
    private readonly tradeRepo: ITradeRepository,
    private readonly journalRepo: IJournalRepository,
    private readonly playbookRepo: IPlaybookRepository,
  ) {}

  private buildFilter(userEmail: string, filter: DateRangeFilter): Record<string, any> {
    const f: Record<string, any> = { userEmail };
    if (filter.dateFrom || filter.dateTo) {
      f.date = {};
      if (filter.dateFrom) f.date.$gte = filter.dateFrom;
      if (filter.dateTo) f.date.$lte = filter.dateTo;
    }
    return f;
  }

  async getOverview(userEmail: string, filter: DateRangeFilter) {
    const f = this.buildFilter(userEmail, filter);
    const trades = await this.tradeRepo.findAll(f);
    trades.forEach(t => (t as any).pnl = t.pnl - (t.fees || 0));

    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
    const totalFees = trades.reduce((s, t) => s + t.fees, 0);
    const winners = trades.filter(t => t.pnl > 0);
    const losers = trades.filter(t => t.pnl < 0);
    const grossProfit = winners.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losers.reduce((s, t) => s + t.pnl, 0));
    const avgWin = winners.length > 0 ? grossProfit / winners.length : 0;
    const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? -1 : 0;
    const expectancy = trades.length > 0 ? totalPnl / trades.length : 0;

    // Sharpe-like ratio
    const dayMap: Record<string, number> = {};
    for (const t of trades) dayMap[t.date] = (dayMap[t.date] || 0) + t.pnl;
    const dailyReturns = Object.values(dayMap);
    const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((s, v) => s + v, 0) / dailyReturns.length : 0;
    const variance = dailyReturns.length > 1
      ? dailyReturns.reduce((s, v) => s + (v - avgReturn) ** 2, 0) / (dailyReturns.length - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : avgReturn > 0 ? -1 : 0;

    // Drawdown — tính theo từng lệnh (trade-by-trade) để bắt intra-day drawdown
    let peak = 0, cumPnl = 0, maxDrawdown = 0, currentDrawdown = 0;
    for (const t of trades) {
      cumPnl += t.pnl;
      if (cumPnl > peak) peak = cumPnl;
      const dd = peak - cumPnl;
      if (dd > maxDrawdown) maxDrawdown = dd;
      currentDrawdown = dd;
    }

    // R:R
    const tradesWithSLandTP = trades.filter(t => t.stopLoss > 0 && t.takeProfit > 0);
    let avgRR = 0;
    if (tradesWithSLandTP.length > 0) {
      const rrValues = tradesWithSLandTP.map(t => {
        const risk = Math.abs(t.entryPrice - t.stopLoss);
        const reward = Math.abs(t.takeProfit - t.entryPrice);
        return risk > 0 ? reward / risk : 0;
      });
      avgRR = rrValues.reduce((s, v) => s + v, 0) / rrValues.length;
    }

    return {
      totalTrades: trades.length,
      totalPnl, totalFees,
      winners: winners.length,
      losers: losers.length,
      breakeven: trades.length - winners.length - losers.length,
      winRate: trades.length > 0 ? (winners.length / trades.length * 100) : 0,
      avgWin, avgLoss, grossProfit, grossLoss,
      profitFactor, expectancy, sharpeRatio,
      maxDrawdown, currentDrawdown, avgRR,
      tradingDays: dailyReturns.length,
    };
  }

  async getByDayOfWeek(userEmail: string, filter: DateRangeFilter) {
    const f = this.buildFilter(userEmail, filter);
    const trades = await this.tradeRepo.findAll(f);
    trades.forEach(t => (t as any).pnl = t.pnl - (t.fees || 0));

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames.map((name, idx) => {
      const dayTrades = trades.filter(t => new Date(t.date + 'T00:00:00').getDay() === idx);
      const wins = dayTrades.filter(t => t.pnl > 0).length;
      return {
        day: name, dayIndex: idx,
        trades: dayTrades.length,
        pnl: dayTrades.reduce((s, t) => s + t.pnl, 0),
        winRate: dayTrades.length > 0 ? (wins / dayTrades.length * 100) : 0,
        avgPnl: dayTrades.length > 0 ? dayTrades.reduce((s, t) => s + t.pnl, 0) / dayTrades.length : 0,
      };
    });
  }

  async getByInstrument(userEmail: string, filter: DateRangeFilter) {
    const f = this.buildFilter(userEmail, filter);
    const trades = await this.tradeRepo.findAll(f);
    trades.forEach(t => (t as any).pnl = t.pnl - (t.fees || 0));

    const map: Record<string, { trades: number; pnl: number; wins: number }> = {};
    for (const t of trades) {
      if (!map[t.instrument]) map[t.instrument] = { trades: 0, pnl: 0, wins: 0 };
      map[t.instrument].trades++;
      map[t.instrument].pnl += t.pnl;
      if (t.pnl > 0) map[t.instrument].wins++;
    }
    return Object.entries(map).map(([name, d]) => ({
      instrument: name, trades: d.trades, pnl: d.pnl,
      winRate: d.trades > 0 ? (d.wins / d.trades * 100) : 0,
      avgPnl: d.trades > 0 ? d.pnl / d.trades : 0,
    })).sort((a, b) => b.pnl - a.pnl);
  }

  async getBySide(userEmail: string, filter: DateRangeFilter) {
    const f = this.buildFilter(userEmail, filter);
    const trades = await this.tradeRepo.findAll(f);
    trades.forEach(t => (t as any).pnl = t.pnl - (t.fees || 0));

    return ['LONG', 'SHORT'].map(side => {
      const sideTrades = trades.filter(t => t.side === side);
      const wins = sideTrades.filter(t => t.pnl > 0).length;
      return {
        side, trades: sideTrades.length,
        pnl: sideTrades.reduce((s, t) => s + t.pnl, 0),
        winRate: sideTrades.length > 0 ? (wins / sideTrades.length * 100) : 0,
        avgPnl: sideTrades.length > 0 ? sideTrades.reduce((s, t) => s + t.pnl, 0) / sideTrades.length : 0,
      };
    });
  }

  async getByTag(userEmail: string, filter: DateRangeFilter) {
    const f = this.buildFilter(userEmail, filter);
    const trades = await this.tradeRepo.findAll(f);
    trades.forEach(t => (t as any).pnl = t.pnl - (t.fees || 0));

    const map: Record<string, { trades: number; pnl: number; wins: number }> = {};
    for (const t of trades) {
      for (const tag of (t.tags || [])) {
        if (!map[tag]) map[tag] = { trades: 0, pnl: 0, wins: 0 };
        map[tag].trades++;
        map[tag].pnl += t.pnl;
        if (t.pnl > 0) map[tag].wins++;
      }
    }
    return Object.entries(map).map(([name, d]) => ({
      tag: name, trades: d.trades, pnl: d.pnl,
      winRate: d.trades > 0 ? (d.wins / d.trades * 100) : 0,
      avgPnl: d.trades > 0 ? d.pnl / d.trades : 0,
    })).sort((a, b) => b.pnl - a.pnl);
  }

  async getByPlaybook(userEmail: string, filter: DateRangeFilter) {
    const f = this.buildFilter(userEmail, filter);
    f.playbookId = { $ne: '' };
    const trades = await this.tradeRepo.findAll(f);
    trades.forEach(t => (t as any).pnl = t.pnl - (t.fees || 0));

    const pbIds = [...new Set(trades.map(t => t.playbookId))];
    const playbooks = await this.playbookRepo.findAll(userEmail);
    const pbFiltered = playbooks.filter(p => pbIds.includes(p._id));
    const pbMap = new Map(pbFiltered.map(p => [p._id, { name: p.name, color: p.color }]));

    const map: Record<string, { name: string; color: string; trades: number; pnl: number; wins: number }> = {};
    for (const t of trades) {
      const pbId = t.playbookId;
      if (!map[pbId]) {
        const info = pbMap.get(pbId) || { name: 'Unknown', color: '#58a6ff' };
        map[pbId] = { name: info.name, color: info.color, trades: 0, pnl: 0, wins: 0 };
      }
      map[pbId].trades++;
      map[pbId].pnl += t.pnl;
      if (t.pnl > 0) map[pbId].wins++;
    }
    return Object.entries(map).map(([id, d]) => ({
      playbookId: id, name: d.name, color: d.color,
      trades: d.trades, pnl: d.pnl,
      winRate: d.trades > 0 ? (d.wins / d.trades * 100) : 0,
      avgPnl: d.trades > 0 ? d.pnl / d.trades : 0,
    })).sort((a, b) => b.pnl - a.pnl);
  }

  async getStreaks(userEmail: string, filter: DateRangeFilter) {
    const matchStage: Record<string, any> = { userEmail };
    if (filter.dateFrom || filter.dateTo) {
      matchStage.date = {};
      if (filter.dateFrom) matchStage.date.$gte = filter.dateFrom;
      if (filter.dateTo) matchStage.date.$lte = filter.dateTo;
    }

    const pipeline: any[] = [];
    if (Object.keys(matchStage).length > 0) pipeline.push({ $match: matchStage });
    pipeline.push(
      { $group: { _id: '$date', day_pnl: { $sum: { $subtract: ['$pnl', { $ifNull: ['$fees', 0] }] } } } },
      { $sort: { _id: 1 } },
    );

    const days = await this.tradeRepo.aggregate(pipeline);
    const dayData = days.map(d => ({ date: d._id, day_pnl: d.day_pnl }));

    let currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0, tempWin = 0, tempLoss = 0;
    for (const d of dayData) {
      if (d.day_pnl > 0) { tempWin++; tempLoss = 0; if (tempWin > maxWinStreak) maxWinStreak = tempWin; }
      else if (d.day_pnl < 0) { tempLoss++; tempWin = 0; if (tempLoss > maxLossStreak) maxLossStreak = tempLoss; }
      else { tempWin = 0; tempLoss = 0; }
    }
    if (dayData.length > 0) {
      const last = dayData[dayData.length - 1];
      if (last.day_pnl > 0) {
        currentStreak = 0;
        for (let i = dayData.length - 1; i >= 0; i--) { if (dayData[i].day_pnl > 0) currentStreak++; else break; }
      } else if (last.day_pnl < 0) {
        currentStreak = 0;
        for (let i = dayData.length - 1; i >= 0; i--) { if (dayData[i].day_pnl < 0) currentStreak--; else break; }
      }
    }

    const heatmap = dayData.map(d => ({ date: d.date, pnl: d.day_pnl }));

    // Rule compliance
    const f = this.buildFilter(userEmail, filter);
    const tradesDocs = await this.tradeRepo.findAll({ ...f, 'ruleChecklist.0': { $exists: true } });
    const compMap: Record<string, { total: number; followed: number }> = {};
    for (const t of tradesDocs) {
      if (!compMap[t.date]) compMap[t.date] = { total: 0, followed: 0 };
      for (const r of t.ruleChecklist) { compMap[t.date].total++; if (r.followed) compMap[t.date].followed++; }
    }
    const compliance = Object.entries(compMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, c]) => ({ date, score: c.total > 0 ? Math.round((c.followed / c.total) * 100) : 0 }));

    return { currentStreak, maxWinStreak, maxLossStreak, heatmap, compliance };
  }

  async getRisk(userEmail: string, filter: DateRangeFilter) {
    const f = this.buildFilter(userEmail, filter);
    const trades = await this.tradeRepo.findAll(f);
    trades.forEach(t => (t as any).pnl = t.pnl - (t.fees || 0));

    const withSL = trades.filter(t => t.stopLoss > 0);
    const withTP = trades.filter(t => t.takeProfit > 0);

    const rrData = withSL.map(t => {
      const risk = Math.abs(t.entryPrice - t.stopLoss);
      const actualReward = t.side === 'LONG' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice;
      const plannedReward = t.takeProfit > 0 ? Math.abs(t.takeProfit - t.entryPrice) : 0;
      return {
        date: t.date, instrument: t.instrument, side: t.side,
        riskPips: risk,
        actualRR: risk > 0 ? actualReward / risk : 0,
        plannedRR: risk > 0 && plannedReward > 0 ? plannedReward / risk : 0,
        pnl: t.pnl,
        hitTP: t.takeProfit > 0 && ((t.side === 'LONG' && t.exitPrice >= t.takeProfit) || (t.side === 'SHORT' && t.exitPrice <= t.takeProfit)),
        hitSL: (t.side === 'LONG' && t.exitPrice <= t.stopLoss) || (t.side === 'SHORT' && t.exitPrice >= t.stopLoss),
      };
    });

    const plannedRR = rrData.filter(r => r.plannedRR > 0);
    const avgRR = plannedRR.length > 0 ? plannedRR.reduce((s, r) => s + r.plannedRR, 0) / plannedRR.length : 0;
    const tpHits = rrData.filter(r => r.hitTP).length;
    const slHits = rrData.filter(r => r.hitSL).length;

    let cumPnl = 0, peak = 0;
    const drawdownCurve = trades.reduce((acc: any[], t) => {
      const lastDate = acc.length > 0 ? acc[acc.length - 1].date : '';
      cumPnl += t.pnl;
      if (cumPnl > peak) peak = cumPnl;
      if (t.date !== lastDate) acc.push({ date: t.date, cumPnl, drawdown: peak - cumPnl, peak });
      else acc[acc.length - 1] = { date: t.date, cumPnl, drawdown: peak - cumPnl, peak };
      return acc;
    }, []);

    return {
      tradesWithSL: withSL.length, tradesWithTP: withTP.length,
      avgRR,
      tpHitRate: rrData.length > 0 ? (tpHits / rrData.length * 100) : 0,
      slHitRate: rrData.length > 0 ? (slHits / rrData.length * 100) : 0,
      rrData, drawdownCurve,
    };
  }

  async getByMood(userEmail: string, filter: DateRangeFilter) {
    const jFilter = this.buildFilter(userEmail, filter);
    const journals = await this.journalRepo.findAll(jFilter, { date: 1 });
    const journalMap = new Map(journals.map(j => [j.date, j.mood]));
    const journalDates = journals.map(j => j.date);
    if (journalDates.length === 0) return [];

    const trades = await this.tradeRepo.findAll({ date: { $in: journalDates }, userEmail });
    trades.forEach(t => (t as any).pnl = t.pnl - (t.fees || 0));

    const dateGroups: Record<string, { mood: string; pnl: number; count: number; wins: number }> = {};
    for (const t of trades) {
      const mood = journalMap.get(t.date) || 'neutral';
      if (!dateGroups[t.date]) dateGroups[t.date] = { mood, pnl: 0, count: 0, wins: 0 };
      dateGroups[t.date].pnl += t.pnl;
      dateGroups[t.date].count++;
      if (t.pnl > 0) dateGroups[t.date].wins++;
    }

    const moodMap: Record<string, { days: number; totalPnl: number; totalTrades: number; wins: number }> = {};
    for (const d of Object.values(dateGroups)) {
      if (!moodMap[d.mood]) moodMap[d.mood] = { days: 0, totalPnl: 0, totalTrades: 0, wins: 0 };
      moodMap[d.mood].days++;
      moodMap[d.mood].totalPnl += d.pnl;
      moodMap[d.mood].totalTrades += d.count;
      moodMap[d.mood].wins += d.wins;
    }

    return Object.entries(moodMap).map(([mood, d]) => ({
      mood, days: d.days, totalPnl: d.totalPnl,
      avgPnlPerDay: d.days > 0 ? d.totalPnl / d.days : 0,
      totalTrades: d.totalTrades,
      winRate: d.totalTrades > 0 ? (d.wins / d.totalTrades * 100) : 0,
    }));
  }

  async getRolling(userEmail: string, window: number) {
    const pipeline = [
      { $match: { userEmail } },
      { $group: { _id: '$date', day_pnl: { $sum: { $subtract: ['$pnl', { $ifNull: ['$fees', 0] }] } }, trade_count: { $sum: 1 } } },
      { $sort: { _id: 1 as const } },
    ];

    const days = await this.tradeRepo.aggregate(pipeline);
    return days.map((d: any, i: number) => {
      const start = Math.max(0, i - window + 1);
      const windowDays = days.slice(start, i + 1);
      const avgPnl = windowDays.reduce((s: number, w: any) => s + w.day_pnl, 0) / windowDays.length;
      const totalPnl = windowDays.reduce((s: number, w: any) => s + w.day_pnl, 0);
      return { date: d._id, dayPnl: d.day_pnl, rollingAvg: avgPnl, rollingTotal: totalPnl, windowSize: windowDays.length };
    });
  }
}
