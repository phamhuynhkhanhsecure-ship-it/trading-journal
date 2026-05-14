import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { playbookApi, rulesApi } from '../../services/api';
import { formatCurrencyShort } from '../../utils/calendarUtils';
import { TAG_COLORS } from '../../types';
import type { Playbook, Rule } from '../../types';
import './Playbook.css';

export default function PlaybookPage() {
  const { t } = useTranslation();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPb, setEditingPb] = useState<Playbook | null>(null);
  const [selectedPb, setSelectedPb] = useState<Playbook | null>(null);
  const [tradingRules, setTradingRules] = useState<Rule[]>([]);
  const [form, setForm] = useState({
    name: '', description: '', entryCriteria: '', exitCriteria: '',
    riskRules: '', color: TAG_COLORS[0], setupRules: [] as string[] ,
  });

  const fetchPlaybooks = useCallback(async () => {
    try {
      const data = await playbookApi.getAll();
      setPlaybooks(data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      const data = await rulesApi.getAll(true); // active rules only
      setTradingRules(data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchPlaybooks(); fetchRules(); }, [fetchPlaybooks, fetchRules]);

  const openNew = () => {
    setEditingPb(null);
    setForm({ name: '', description: '', entryCriteria: '', exitCriteria: '', riskRules: '', color: TAG_COLORS[0], setupRules: [] });
    setShowModal(true);
  };

  const openEdit = (pb: Playbook) => {
    setEditingPb(pb);
    setForm({
      name: pb.name, description: pb.description,
      entryCriteria: pb.entryCriteria, exitCriteria: pb.exitCriteria,
      riskRules: pb.riskRules, color: pb.color,
      setupRules: pb.setupRules,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      const data = {
        name: form.name.trim(),
        description: form.description,
        entryCriteria: form.entryCriteria,
        exitCriteria: form.exitCriteria,
        riskRules: form.riskRules,
        color: form.color,
        setupRules: form.setupRules,
      };
      if (editingPb) {
        await playbookApi.update(editingPb.id, data);
      } else {
        await playbookApi.create(data);
      }
      setShowModal(false);
      await fetchPlaybooks();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('playbook.deleteConfirm', 'Xóa chiến lược này? Các lệnh sử dụng nó sẽ bị gỡ liên kết.'))) return;
    try {
      await playbookApi.delete(id);
      if (selectedPb?.id === id) setSelectedPb(null);
      await fetchPlaybooks();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="playbook-page">
      <div className="playbook-page__header">
        <div>
          <h1 className="playbook-page__title">📱 {t('layout.playbook', 'Chiến lược')}</h1>
          <p className="playbook-page__subtitle">{t('playbook.subtitle', 'Thư viện chiến lược — định nghĩa và theo dõi hiệu suất.')}</p>
        </div>
        <button className="btn btn--primary" onClick={openNew}>+ {t('playbook.new', 'Chiến lược mới')}</button>
      </div>

      {playbooks.length === 0 ? (
        <div className="playbook-empty">
          <div className="playbook-empty__icon">📱</div>
          <h2>{t('playbook.emptyTitle', 'Chưa có chiến lược')}</h2>
          <p>{t('playbook.emptyDesc', 'Tạo chiến lược đầu tiên để theo dõi hiệu suất.')}</p>
          <button className="btn btn--primary" onClick={openNew}>+ {t('playbook.create', 'Tạo chiến lược')}</button>
        </div>
      ) : (
        <div className="playbook-layout">
          <div className="playbook-list">
            {playbooks.map((pb, idx) => (
              <div
                key={pb.id}
                className={`playbook-card ${selectedPb?.id === pb.id ? 'playbook-card--active' : ''}`}
                style={{ borderLeftColor: pb.color, animationDelay: `${idx * 40}ms` }}
                onClick={() => setSelectedPb(pb)}
              >
                <div className="playbook-card__header">
                  <span className="playbook-card__dot" style={{ background: pb.color }} />
                  <span className="playbook-card__name">{pb.name}</span>
                </div>
                {pb.description && <p className="playbook-card__desc">{pb.description}</p>}
                <div className="playbook-card__stats">
                  <span className="playbook-card__stat">{pb.tradeCount || 0} {t('calendar.trades', 'lệnh')}</span>
                  <span className="playbook-card__stat">
                    {t('analytics.winRate', 'Tỷ lệ %')}: {(pb.winRate || 0).toFixed(0)}%
                  </span>
                  <span className={`playbook-card__stat ${(pb.totalPnl || 0) > 0 ? 'positive' : (pb.totalPnl || 0) < 0 ? 'negative' : ''}`}>
                    {(pb.totalPnl || 0) > 0 ? '+' : ''}{formatCurrencyShort(pb.totalPnl || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selectedPb && (
            <div className="playbook-detail">
              <div className="playbook-detail__header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="playbook-card__dot" style={{ background: selectedPb.color, width: 14, height: 14 }} />
                  <h2 className="playbook-detail__title">{selectedPb.name}</h2>
                </div>
                <div className="playbook-detail__actions">
                  <button className="btn btn--secondary btn--sm" onClick={() => openEdit(selectedPb)}>{t('journal.edit', 'Sửa')}</button>
                  <button className="btn btn--danger btn--sm" onClick={() => handleDelete(selectedPb.id)}>{t('journal.delete', 'Xóa')}</button>
                </div>
              </div>

              {selectedPb.description && (
                <p className="playbook-detail__desc">{selectedPb.description}</p>
              )}

              {/* Stats */}
              <div className="playbook-detail__stats-grid">
                <div className="playbook-stat-card">
                  <span className="playbook-stat-card__label">{t('calendar.trades', 'Lệnh')}</span>
                  <span className="playbook-stat-card__value">{selectedPb.tradeCount || 0}</span>
                </div>
                <div className="playbook-stat-card">
                  <span className="playbook-stat-card__label">{t('analytics.winRate', 'Tỷ lệ thắng')}</span>
                  <span className={`playbook-stat-card__value ${(selectedPb.winRate || 0) >= 50 ? 'positive' : 'negative'}`}>
                    {(selectedPb.winRate || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="playbook-stat-card">
                  <span className="playbook-stat-card__label">Tổng L/L</span>
                  <span className={`playbook-stat-card__value ${(selectedPb.totalPnl || 0) > 0 ? 'positive' : 'negative'}`}>
                    {(selectedPb.totalPnl || 0) > 0 ? '+' : ''}{formatCurrencyShort(selectedPb.totalPnl || 0)}
                  </span>
                </div>
                <div className="playbook-stat-card">
                  <span className="playbook-stat-card__label">TB L/L</span>
                  <span className={`playbook-stat-card__value ${(selectedPb.avgPnl || 0) > 0 ? 'positive' : 'negative'}`}>
                    {(selectedPb.avgPnl || 0) > 0 ? '+' : ''}{formatCurrencyShort(selectedPb.avgPnl || 0)}
                  </span>
                </div>
              </div>

              {/* Setup Rules */}
              {selectedPb.setupRules.length > 0 && (
                <div className="playbook-detail__section">
                  <h3 className="playbook-detail__section-title">📋 {t('playbook.setupRules', 'Quy tắc thiết lập')}</h3>
                  <ul className="playbook-checklist">
                    {selectedPb.setupRules.map((ruleId, i) => {
                      const matchedRule = tradingRules.find(r => r.id === ruleId);
                      return (
                        <li key={i} className="playbook-checklist__item">
                          <span className="playbook-checklist__bullet">•</span>
                          {matchedRule ? matchedRule.name : ruleId}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {selectedPb.entryCriteria && (
                <div className="playbook-detail__section">
                  <h3 className="playbook-detail__section-title">🟢 {t('playbook.entryCriteria', 'Điều kiện vào lệnh')}</h3>
                  <p className="playbook-detail__text">{selectedPb.entryCriteria}</p>
                </div>
              )}

              {selectedPb.exitCriteria && (
                <div className="playbook-detail__section">
                  <h3 className="playbook-detail__section-title">🔴 {t('playbook.exitCriteria', 'Điều kiện thoát lệnh')}</h3>
                  <p className="playbook-detail__text">{selectedPb.exitCriteria}</p>
                </div>
              )}

              {selectedPb.riskRules && (
                <div className="playbook-detail__section">
                  <h3 className="playbook-detail__section-title">⚠️ {t('playbook.riskRules', 'Quản lý rủi ro')}</h3>
                  <p className="playbook-detail__text">{selectedPb.riskRules}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{editingPb ? 'Sửa chiến lược' : 'Chiến lược mới'}</h2>
              <button className="modal__close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal__body">
              <form className="trade-form" onSubmit={handleSave}>
                <div className="trade-form__row">
                  <div className="trade-form__field" style={{ flex: 2 }}>
                    <label className="trade-form__label">Tên</label>
                    <input
                      type="text" className="trade-form__input"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="ví dụ: Breakout phiên sáng" required
                    />
                  </div>
                  <div className="trade-form__field">
                    <label className="trade-form__label">Màu</label>
                    <div style={{ display: 'flex', gap: 6, padding: '6px 0' }}>
                      {TAG_COLORS.map(c => (
                        <button key={c} type="button"
                          className={`tag-color-btn ${form.color === c ? 'tag-color-btn--active' : ''}`}
                          style={{ background: c }}
                          onClick={() => setForm(f => ({ ...f, color: c }))}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="trade-form__field trade-form__field--full">
                  <label className="trade-form__label">Mô tả</label>
                  <textarea className="trade-form__textarea"
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Mô tả chiến lược..."
                  />
                </div>

                <div className="trade-form__field trade-form__field--full">
                  <label className="trade-form__label">Quy tắc thiết lập (Kéo thả hoặc dùng nút để đổi vị trí)</label>
                  <div className="playbook-sortable-list">
                    {tradingRules.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có quy tắc nào. Hãy thêm trong menu Quy tắc.</span>}
                    
                    {/* Selected rules with ordering */}
                    {form.setupRules.map((ruleId, index) => {
                      const rule = tradingRules.find(r => r.id === ruleId);
                      if (!rule) return null;
                      return (
                        <div
                          key={rule.id}
                          className="playbook-sortable-item"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', index.toString());
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const dragIndexStr = e.dataTransfer.getData('text/plain');
                            if (!dragIndexStr) return;
                            const dragIndex = parseInt(dragIndexStr, 10);
                            if (dragIndex === index) return;
                            setForm(f => {
                              const newRules = [...f.setupRules];
                              const [dragged] = newRules.splice(dragIndex, 1);
                              newRules.splice(index, 0, dragged);
                              return { ...f, setupRules: newRules };
                            });
                          }}
                        >
                          <div className="playbook-sortable-item__content">
                            <span className="playbook-sortable-item__drag-handle">⋮⋮</span>
                            <label className="playbook-sortable-item__label">
                              <input type="checkbox"
                                checked={true}
                                onChange={() => setForm(f => ({ ...f, setupRules: f.setupRules.filter(r => r !== rule.id) }))}
                              />
                              {rule.name}
                            </label>
                          </div>
                          
                          <div className="playbook-sortable-item__actions" onClick={e => e.stopPropagation()}>
                            <button type="button" className="playbook-sortable-btn" disabled={index === 0}
                              onClick={(e) => {
                                e.preventDefault();
                                setForm(f => {
                                  const newRules = [...f.setupRules];
                                  const temp = newRules[index];
                                  newRules[index] = newRules[index - 1];
                                  newRules[index - 1] = temp;
                                  return { ...f, setupRules: newRules };
                                });
                              }}
                              title="Lên trên"
                            >↑</button>
                            <button type="button" className="playbook-sortable-btn" disabled={index === form.setupRules.length - 1}
                              onClick={(e) => {
                                e.preventDefault();
                                setForm(f => {
                                  const newRules = [...f.setupRules];
                                  const temp = newRules[index];
                                  newRules[index] = newRules[index + 1];
                                  newRules[index + 1] = temp;
                                  return { ...f, setupRules: newRules };
                                });
                              }}
                              title="Xuống dưới"
                            >↓</button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Unselected rules */}
                    {tradingRules.filter(r => !form.setupRules.includes(r.id)).length > 0 && (
                      <div className="playbook-unselected-rules">
                        <div className="playbook-unselected-title">Quy tắc có sẵn</div>
                        {tradingRules.filter(r => !form.setupRules.includes(r.id)).map(rule => (
                          <label key={rule.id} className="playbook-unselected-item">
                            <input type="checkbox"
                              checked={false}
                              onChange={() => setForm(f => ({ ...f, setupRules: [...f.setupRules, rule.id] }))}
                            />
                            {rule.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="trade-form__row">
                  <div className="trade-form__field">
                    <label className="trade-form__label">{t('playbook.entryCriteria', 'Điều kiện vào lệnh')}</label>
                    <textarea className="trade-form__textarea" style={{ minHeight: 60 }}
                      value={form.entryCriteria} onChange={e => setForm(f => ({ ...f, entryCriteria: e.target.value }))}
                      placeholder={t('playbook.entryCriteria', 'Khi nào vào lệnh...')}
                    />
                  </div>
                  <div className="trade-form__field">
                    <label className="trade-form__label">{t('playbook.exitCriteria', 'Điều kiện thoát lệnh')}</label>
                    <textarea className="trade-form__textarea" style={{ minHeight: 60 }}
                      value={form.exitCriteria} onChange={e => setForm(f => ({ ...f, exitCriteria: e.target.value }))}
                      placeholder={t('playbook.exitCriteria', 'Khi nào thoát lệnh...')}
                    />
                  </div>
                </div>

                <div className="trade-form__field trade-form__field--full">
                  <label className="trade-form__label">{t('playbook.riskRules', 'Quản lý rủi ro')}</label>
                  <textarea className="trade-form__textarea" style={{ minHeight: 60 }}
                    value={form.riskRules} onChange={e => setForm(f => ({ ...f, riskRules: e.target.value }))}
                    placeholder={t('playbook.riskRules', 'Rủi ro tối đa, quy tắc khối lượng...')}
                  />
                </div>

                <div className="trade-form__actions">
                  <button type="button" className="btn btn--secondary" onClick={() => setShowModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn--primary">{editingPb ? 'Cập nhật' : 'Tạo'} chiến lược</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
