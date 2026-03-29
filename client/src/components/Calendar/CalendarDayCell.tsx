import { formatCurrencyShort, isToday } from '../../utils/calendarUtils';
import type { DayData, WeekSummary } from '../../types';

interface CalendarDayCellProps {
  day: number | null;
  year: number;
  month: number;
  dayData?: DayData;
  weekSummary?: WeekSummary;
  isSaturday: boolean;
  onDayClick: (day: number) => void;
  onAddTrade: (day: number) => void;
}

export default function CalendarDayCell({
  day,
  year,
  month,
  dayData,
  weekSummary,
  isSaturday,
  onDayClick,
  onAddTrade,
}: CalendarDayCellProps) {
  if (day === null) {
    return <div className="day-cell day-cell--empty" />;
  }

  const today = isToday(year, month, day);
  const hasTrades = dayData && dayData.tradeCount > 0;
  const pnl = dayData?.totalPnl || 0;

  let cellClass = 'day-cell';
  if (today) cellClass += ' day-cell--today';
  if (hasTrades) {
    cellClass += ' day-cell--has-trades';
    if (pnl > 0) cellClass += ' day-cell--profit';
    else if (pnl < 0) cellClass += ' day-cell--loss';
  }
  if (isSaturday) cellClass += ' day-cell--saturday';

  const handleClick = () => {
    if (hasTrades) onDayClick(day);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddTrade(day);
  };

  return (
    <div className={cellClass} onClick={handleClick}>
      <span className="day-cell__number">{day}</span>

      {!isSaturday && (
        <button
          className="day-cell__add-btn"
          onClick={handleAddClick}
          aria-label={`Add trade on day ${day}`}
        >
          +
        </button>
      )}

      {hasTrades && !isSaturday && (
        <>
          <span
            className={`day-cell__pnl ${
              pnl > 0 ? 'day-cell__pnl--profit' : 'day-cell__pnl--loss'
            }`}
          >
            {formatCurrencyShort(pnl)}
          </span>
          <span className="day-cell__trades">
            {dayData!.tradeCount} trade{dayData!.tradeCount !== 1 ? 's' : ''}
          </span>
        </>
      )}

      {isSaturday && weekSummary && (
        <div className="week-summary">
          <span className="week-summary__label">Week {weekSummary.weekNumber}</span>
          <span
            className={`week-summary__pnl ${
              weekSummary.totalPnl > 0
                ? 'week-summary__pnl--profit'
                : weekSummary.totalPnl < 0
                  ? 'week-summary__pnl--loss'
                  : 'week-summary__pnl--neutral'
            }`}
          >
            {formatCurrencyShort(weekSummary.totalPnl)}
          </span>
          <span className="week-summary__trades">
            {weekSummary.totalTrades} trade{weekSummary.totalTrades !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
