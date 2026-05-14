import { useTranslation } from 'react-i18next';
import { formatCurrencyShort } from '../../utils/calendarUtils';
import type { MonthData } from '../../types';

interface CalendarHeaderProps {
  monthData: MonthData;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export default function CalendarHeader({
  monthData,
  onPrevMonth,
  onNextMonth,
  onToday,
}: CalendarHeaderProps) {
  const { t } = useTranslation();
  const pnlClass =
    monthData.totalPnl > 0
      ? 'calendar-header__monthly-pnl--profit'
      : monthData.totalPnl < 0
        ? 'calendar-header__monthly-pnl--loss'
        : 'calendar-header__monthly-pnl--neutral';

  return (
    <div className="calendar-header">
      <div className="calendar-header__top">
        <div className="calendar-header__nav">
          <button
            className="calendar-header__nav-btn"
            onClick={onPrevMonth}
            aria-label="Previous month"
            id="btn-prev-month"
          >
            ‹
          </button>
          <span className="calendar-header__month-label">
            {t(`calendar.months.${monthData.month}`)} {monthData.year}
          </span>
          <button
            className="calendar-header__nav-btn"
            onClick={onNextMonth}
            aria-label="Next month"
            id="btn-next-month"
          >
            ›
          </button>
        </div>

        <span className={`calendar-header__monthly-pnl ${pnlClass}`}>
          {t('calendar.monthlyPnl', 'L/L tháng:')} {formatCurrencyShort(monthData.totalPnl)}
        </span>

        <button
          className="calendar-header__today-btn"
          onClick={onToday}
          id="btn-today"
        >
          {t('calendar.today', 'Hôm nay')}
        </button>
      </div>
    </div>
  );
}
