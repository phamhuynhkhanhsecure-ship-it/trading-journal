import type { Trade, DayData, WeekSummary, MonthData } from '../types';

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatCurrency(amount: number, isBlindMode = false): string {
  if (isBlindMode) {
    if (amount < 0) return '-$***';
    if (amount > 0) return '+$***';
    return '$***';
  }
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (amount < 0) return `-$${formatted}`;
  if (amount > 0) return `+$${formatted}`;
  return `$${formatted}`;
}

export function formatCurrencyShort(amount: number, isBlindMode = false): string {
  if (isBlindMode) {
    if (amount < 0) return '-$***';
    if (amount > 0) return '+$***';
    return '$***';
  }
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (amount < 0) return `-$${formatted}`;
  return `$${formatted}`;
}

export function isToday(year: number, month: number, day: number): boolean {
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() + 1 === month &&
    today.getDate() === day
  );
}

export function getMonthName(month: number): string {
  const names = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ];
  return names[month - 1] || '';
}

export function getMonthNameShort(month: number): string {
  const names = [
    'Th01', 'Th02', 'Th03', 'Th04', 'Th05', 'Th06',
    'Th07', 'Th08', 'Th09', 'Th10', 'Th11', 'Th12',
  ];
  return names[month - 1] || '';
}

export function aggregateByDay(trades: Trade[]): Record<string, DayData> {
  const map: Record<string, DayData> = {};
  for (const trade of trades) {
    if (!map[trade.date]) {
      map[trade.date] = {
        date: trade.date,
        trades: [],
        totalPnl: 0,
        tradeCount: 0,
      };
    }
    map[trade.date].trades.push(trade);
    map[trade.date].totalPnl += (trade.pnl - (trade.fees || 0));
    map[trade.date].tradeCount += 1;
  }
  return map;
}

export function calculateWeekSummaries(
  year: number,
  month: number,
  dayDataMap: Record<string, DayData>
): WeekSummary[] {
  const daysInMonth = getDaysInMonth(year, month);
  const weeks: WeekSummary[] = [];

  let weekNum = 1;
  let weekPnl = 0;
  let weekTrades = 0;

  // Process the first partial week (if month doesn't start on Sunday)
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(year, month, day);
    const dayOfWeek = new Date(year, month - 1, day).getDay();

    if (dayDataMap[dateStr]) {
      weekPnl += dayDataMap[dateStr].totalPnl;
      weekTrades += dayDataMap[dateStr].tradeCount;
    }

    // Saturday = end of week
    if (dayOfWeek === 6 || day === daysInMonth) {
      weeks.push({
        weekNumber: weekNum,
        totalPnl: weekPnl,
        totalTrades: weekTrades,
      });
      weekNum++;
      weekPnl = 0;
      weekTrades = 0;
    }
  }

  return weeks;
}

export function buildMonthData(year: number, month: number, trades: Trade[]): MonthData {
  const monthTrades = trades.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  const dayDataMap = aggregateByDay(monthTrades);
  const weekSummaries = calculateWeekSummaries(year, month, dayDataMap);

  let winningDays = 0;
  let losingDays = 0;
  Object.values(dayDataMap).forEach(dd => {
    if (dd.totalPnl > 0) winningDays++;
    else if (dd.totalPnl < 0) losingDays++;
  });

  return {
    year,
    month,
    trades: monthTrades,
    totalPnl: monthTrades.reduce((sum, t) => sum + (t.pnl - (t.fees || 0)), 0),
    totalTrades: monthTrades.length,
    winningDays,
    losingDays,
    dayDataMap,
    weekSummaries,
  };
}

export function getCalendarGrid(year: number, month: number): (number | null)[][] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const rows: (number | null)[][] = [];
  let currentRow: (number | null)[] = [];

  // Padding for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    currentRow.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentRow.push(day);
    if (currentRow.length === 7) {
      rows.push(currentRow);
      currentRow = [];
    }
  }

  // Padding for remaining days
  if (currentRow.length > 0) {
    while (currentRow.length < 7) {
      currentRow.push(null);
    }
    rows.push(currentRow);
  }

  return rows;
}
