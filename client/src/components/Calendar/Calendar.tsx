import { useState, useEffect, useCallback } from 'react';
import CalendarHeader from './CalendarHeader';
import CalendarDayCell from './CalendarDayCell';
import TradeModal from '../TradeForm/TradeModal';
import DayDetailModal from '../TradeForm/DayDetailModal';
import TradeDetailModal from '../TradeForm/TradeDetailModal';
import { tradeApi } from '../../services/api';
import {
  getCalendarGrid,
  buildMonthData,
  formatDate,
} from '../../utils/calendarUtils';
import type { Trade, MonthData } from '../../types';
import './Calendar.css';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [, setLoading] = useState(true);

  // Modal state
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [dayDetailDate, setDayDetailDate] = useState<string>('');
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);

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

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const monthData: MonthData = buildMonthData(year, month, trades);
  const grid = getCalendarGrid(year, month);

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(y => y - 1);
      setMonth(12);
    } else {
      setMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(y => y + 1);
      setMonth(1);
    } else {
      setMonth(m => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  const handleDayClick = (day: number) => {
    const dateStr = formatDate(year, month, day);
    setDayDetailDate(dateStr);
    setDayDetailOpen(true);
  };

  const handleAddTrade = (day: number) => {
    const dateStr = formatDate(year, month, day);
    setSelectedDate(dateStr);
    setEditingTrade(null);
    setTradeModalOpen(true);
  };

  const handleEditTrade = (trade: Trade) => {
    setViewingTrade(null);
    setDayDetailOpen(false);
    setEditingTrade(trade);
    setSelectedDate(trade.date);
    setTradeModalOpen(true);
  };

  const handleViewTrade = (trade: Trade) => {
    setDayDetailOpen(false);
    setViewingTrade(trade);
  };

  const handleDeleteTrade = async (id: string) => {
    try {
      await tradeApi.delete(id);
      await fetchTrades();
    } catch (err) {
      console.error('Failed to delete trade:', err);
    }
  };

  const handleTradeSubmit = async (tradeData: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingTrade) {
        await tradeApi.update(editingTrade.id, tradeData);
      } else {
        // Create trade, then upload pending files
        const created = await tradeApi.create(tradeData);
        // Check if there are pending files from the form
        const formEl = document.getElementById('trade-form');
        const pendingFiles = (formEl as any)?.__pendingFiles as File[] | undefined;
        if (pendingFiles && pendingFiles.length > 0) {
          await tradeApi.uploadImages(created.id, pendingFiles);
        }
      }
      setTradeModalOpen(false);
      setEditingTrade(null);
      await fetchTrades();
    } catch (err) {
      console.error('Failed to save trade:', err);
    }
  };

  // Track which week each Saturday row belongs to
  let weekIndex = 0;

  return (
    <div className="calendar-container">
      <CalendarHeader
        monthData={monthData}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
      />

      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={`calendar-weekday ${i >= 1 && i <= 5 ? 'calendar-weekday--trading' : ''}`}>{d}</div>
          ))}
        </div>

        <div className="calendar-rows">
          {grid.map((row, rowIdx) => {
            // Calculate the week number for this row
            const hasSaturday = row[6] !== null;
            const currentWeekIndex = hasSaturday ? weekIndex++ : -1;
            const weekSummary = hasSaturday
              ? monthData.weekSummaries[currentWeekIndex]
              : undefined;

            return (
              <div key={rowIdx} className="calendar-row">
                {row.map((day, colIdx) => {
                  const isSaturday = colIdx === 6;
                  const dateStr = day ? formatDate(year, month, day) : '';
                  const dayData = dateStr ? monthData.dayDataMap[dateStr] : undefined;

                  return (
                    <CalendarDayCell
                      key={colIdx}
                      day={day}
                      year={year}
                      month={month}
                      dayData={dayData}
                      weekSummary={isSaturday ? weekSummary : undefined}
                      isSaturday={isSaturday}
                      onDayClick={handleDayClick}
                      onAddTrade={handleAddTrade}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {tradeModalOpen && (
        <TradeModal
          trade={editingTrade}
          defaultDate={selectedDate}
          onSubmit={handleTradeSubmit}
          onClose={() => {
            setTradeModalOpen(false);
            setEditingTrade(null);
          }}
        />
      )}

      {dayDetailOpen && (
        <DayDetailModal
          date={dayDetailDate}
          trades={monthData.dayDataMap[dayDetailDate]?.trades || []}
          onClose={() => setDayDetailOpen(false)}
          onView={handleViewTrade}
          onEdit={handleEditTrade}
          onDelete={handleDeleteTrade}
          onAddTrade={() => {
            setDayDetailOpen(false);
            setSelectedDate(dayDetailDate);
            setEditingTrade(null);
            setTradeModalOpen(true);
          }}
        />
      )}

      {viewingTrade && (
        <TradeDetailModal
          trade={viewingTrade}
          onClose={() => setViewingTrade(null)}
          onEdit={handleEditTrade}
        />
      )}
    </div>
  );
}
