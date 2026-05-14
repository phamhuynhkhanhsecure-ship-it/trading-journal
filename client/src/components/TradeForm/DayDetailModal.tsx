import { useTranslation } from 'react-i18next';
import type { Trade } from '../../types';
import { formatCurrencyShort } from '../../utils/calendarUtils';
import './TradeForm.css';

interface DayDetailModalProps {
  date: string;
  trades: Trade[];
  onClose: () => void;
  onView: (trade: Trade) => void;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onAddTrade: () => void;
}

export default function DayDetailModal({
  date,
  trades,
  onClose,
  onView,
  onEdit,
  onDelete,
  onAddTrade,
}: DayDetailModalProps) {
  const { t, i18n } = useTranslation();
  const totalFees = trades.reduce((sum, t) => sum + (t.fees || 0), 0);
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl - (t.fees || 0)), 0);
  const pnlClass = totalPnl > 0 ? 'day-detail__stat-value--profit' : totalPnl < 0 ? 'day-detail__stat-value--loss' : '';

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString(i18n.language || 'vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDelete = (id: string) => {
    if (window.confirm(t('dayDetail.deleteConfirm', 'Bạn có chắc muốn xóa lệnh này không?'))) {
      onDelete(id);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">{t('dayDetail.title', 'Chi tiết ngày')}</h2>
          <button className="modal__close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          <p className="day-detail__date">{formattedDate}</p>

          <div className="day-detail__summary">
            <div className="day-detail__stat">
              <span className="day-detail__stat-label">{t('dayDetail.totalPnl', 'Tổng L/L')}</span>
              <span className={`day-detail__stat-value ${pnlClass}`}>
                {formatCurrencyShort(totalPnl)}
              </span>
            </div>
            <div className="day-detail__stat">
              <span className="day-detail__stat-label">{t('dayDetail.tradesNum', 'Lệnh')}</span>
              <span className="day-detail__stat-value">{trades.length}</span>
            </div>
            <div className="day-detail__stat">
              <span className="day-detail__stat-label">{t('dayDetail.fees', 'Phí')}</span>
              <span className="day-detail__stat-value">{formatCurrencyShort(totalFees)}</span>
            </div>
          </div>

          {trades.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>
              {t('dayDetail.empty', 'Không có lệnh trong ngày này.')}
            </p>
          ) : (
            <div className="day-detail__trades-list">
              {trades.map(trade => {
                const ruleCount = trade.ruleChecklist?.length || 0;
                const followedCount = trade.ruleChecklist?.filter(r => r.followed).length || 0;
                const ruleScore = ruleCount > 0 ? Math.round((followedCount / ruleCount) * 100) : -1;
                const scoreClass = ruleScore >= 80 ? 'rule-score--high' : ruleScore >= 50 ? 'rule-score--medium' : 'rule-score--low';

                return (
                <div key={trade.id} className="day-detail__trade-card">
                  <div className="day-detail__trade-info">
                    <span className="day-detail__trade-instrument">{trade.instrument}</span>
                    <span className={`day-detail__trade-side day-detail__trade-side--${trade.side.toLowerCase()}`}>
                      {trade.side}
                    </span>
                    {ruleScore >= 0 && (
                      <span className={`rule-score ${scoreClass}`}>
                        ✓ {followedCount}/{ruleCount}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className={`day-detail__trade-pnl ${
                      (trade.pnl - (trade.fees || 0)) > 0 ? 'day-detail__stat-value--profit' : 'day-detail__stat-value--loss'
                    }`}>
                      {formatCurrencyShort(trade.pnl - (trade.fees || 0))}
                    </span>
                    <div className="day-detail__trade-actions">
                      <button className="btn btn--ghost btn--sm" onClick={() => onView(trade)}>
                        {t('journal.view', 'Xem')}
                      </button>
                      <button className="btn btn--secondary btn--sm" onClick={() => onEdit(trade)}>
                        {t('journal.edit', 'Sửa')}
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleDelete(trade.id)}>
                        {t('journal.delete', 'Xóa')}
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          <div className="day-detail__footer">
            <button className="btn btn--primary" onClick={onAddTrade}>
              + {t('tradeForm.addTrade', 'Thêm lệnh')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
