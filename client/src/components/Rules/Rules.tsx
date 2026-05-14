import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { rulesApi } from '../../services/api';
import type { Rule } from '../../types';
import './Rules.css';

export default function Rules() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<Rule[]>([]);
  const [newRuleName, setNewRuleName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Drag-and-drop state
  const dragItemRef = useRef<number | null>(null);
  const dragOverItemRef = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const data = await rulesApi.getAll();
      setRules(data);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;
    try {
      await rulesApi.create({ name: newRuleName.trim() });
      setNewRuleName('');
      await fetchRules();
    } catch (err) {
      console.error('Failed to add rule:', err);
    }
  };

  const handleToggle = async (rule: Rule) => {
    try {
      await rulesApi.update(rule.id, { isActive: !rule.isActive });
      await fetchRules();
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('rules.deleteConfirm', 'Xóa quy tắc này? Nó sẽ bị loại bỏ khỏi tất cả các checklist lệnh.'))) return;
    try {
      await rulesApi.delete(id);
      await fetchRules();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleStartEdit = (rule: Rule) => {
    setEditingId(rule.id);
    setEditName(rule.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await rulesApi.update(id, { name: editName.trim() });
      setEditingId(null);
      await fetchRules();
    } catch (err) {
      console.error('Failed to update rule:', err);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') handleSaveEdit(id);
    if (e.key === 'Escape') setEditingId(null);
  };

  // ===== Drag-and-drop handlers =====
  const handleDragStart = (index: number) => {
    dragItemRef.current = index;
    setDragIndex(index);
  };

  const handleDragEnter = (index: number) => {
    dragOverItemRef.current = index;
    setDropTargetIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required for drop to fire
  };

  const handleDragEnd = async () => {
    const fromIndex = dragItemRef.current;
    const toIndex = dragOverItemRef.current;

    // Reset visual state
    setDragIndex(null);
    setDropTargetIndex(null);
    dragItemRef.current = null;
    dragOverItemRef.current = null;

    if (fromIndex === null || toIndex === null || fromIndex === toIndex) return;

    // Reorder locally first for instant feedback
    const reordered = [...rules];
    const [movedItem] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedItem);
    setRules(reordered);

    // Persist to backend
    try {
      const order = reordered.map((rule, idx) => ({ id: rule.id, sortOrder: idx }));
      await rulesApi.reorder(order);
    } catch (err) {
      console.error('Failed to reorder rules:', err);
      await fetchRules(); // Rollback on error
    }
  };

  return (
    <div className="rules-page">
      <div className="rules-page__header">
        <div>
          <h1 className="rules-page__title">{t('layout.rules', 'Quy tắc giao dịch')}</h1>
          <p className="rules-page__subtitle">
            {t('rules.subtitle', 'Định nghĩa các quy tắc của bạn. Các quy tắc đang bật sẽ xuất hiện khi bạn ghi lệnh.')}
          </p>
        </div>
      </div>

      <form className="rules-add-form" onSubmit={handleAdd}>
        <input
          type="text"
          className="rules-add-form__input"
          placeholder={t('rules.placeholder', 'Thêm quy tắc mới... (ví dụ: Chờ tín hiệu xác nhận)')}
          value={newRuleName}
          onChange={e => setNewRuleName(e.target.value)}
          id="input-new-rule"
        />
        <button type="submit" className="btn btn--primary" disabled={!newRuleName.trim()}>
          + {t('rules.add', 'Thêm quy tắc')}
        </button>
      </form>

      <div className="rules-list">
        {rules.length === 0 ? (
          <div className="rules-list__empty">
            {t('rules.empty', 'Chưa có quy tắc nào. Thêm quy tắc đầu tiên!')}
          </div>
        ) : (
          rules.map((rule, idx) => (
            <div
              key={rule.id}
              className={[
                'rule-card',
                !rule.isActive ? 'rule-card--inactive' : '',
                dragIndex === idx ? 'rule-card--dragging' : '',
                dropTargetIndex === idx && dragIndex !== idx ? 'rule-card--drop-target' : '',
              ].filter(Boolean).join(' ')}
              style={{ animationDelay: `${idx * 50}ms` }}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <span className="rule-card__handle" title={t('rules.dragTitle', 'Kéo để sắp xếp')}>⠿</span>

              <div className="rule-card__content">
                {editingId === rule.id ? (
                  <input
                    className="rule-card__name-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => handleEditKeyDown(e, rule.id)}
                    onBlur={() => handleSaveEdit(rule.id)}
                    autoFocus
                  />
                ) : (
                  <div
                    className="rule-card__name"
                    onDoubleClick={() => handleStartEdit(rule)}
                  >
                    {rule.name}
                  </div>
                )}
              </div>

              <button
                className={`rule-card__toggle ${rule.isActive ? 'rule-card__toggle--active' : ''}`}
                onClick={() => handleToggle(rule)}
                aria-label={`Toggle rule: ${rule.name}`}
              />

              <div className="rule-card__actions">
                <button className="btn btn--secondary btn--sm" onClick={() => handleStartEdit(rule)}>
                  {t('journal.edit', 'Sửa')}
                </button>
                <button className="btn btn--danger btn--sm" onClick={() => handleDelete(rule.id)}>
                  {t('journal.delete', 'Xóa')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
