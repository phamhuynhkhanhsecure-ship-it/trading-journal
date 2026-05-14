import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { tagsApi } from '../../services/api';
import { TAG_COLORS } from '../../types';
import type { Tag } from '../../types';
import './Tags.css';

export default function Tags() {
  const { t } = useTranslation();
  const [tags, setTags] = useState<(Tag & { usageCount?: number })[]>([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const fetchTags = useCallback(async () => {
    try {
      const data = await tagsApi.getAll();
      setTags(data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await tagsApi.create({ name: newName.trim(), color: newColor });
      setNewName('');
      setNewColor(TAG_COLORS[0]);
      await fetchTags();
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        alert(t('tags.exists', 'Nhãn đã tồn tại!'));
      }
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('tags.deleteConfirm', 'Xóa nhãn này?'))) return;
    try {
      await tagsApi.delete(id);
      await fetchTags();
    } catch (err) { console.error(err); }
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await tagsApi.update(id, { name: editName.trim(), color: editColor });
      setEditingId(null);
      await fetchTags();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="tags-page">
      <div className="tags-page__header">
        <div>
          <h1 className="tags-page__title">🏷️ {t('layout.tags', 'Nhãn')}</h1>
          <p className="tags-page__subtitle">{t('tags.subtitle', 'Quản lý nhãn và theo dõi hiệu suất theo nhãn.')}</p>
        </div>
      </div>

      {/* Add tag form */}
      <form className="tag-add-form" onSubmit={handleAdd}>
        <div className="tag-add-form__colors">
          {TAG_COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={`tag-color-btn ${newColor === c ? 'tag-color-btn--active' : ''}`}
              style={{ background: c }}
              onClick={() => setNewColor(c)}
            />
          ))}
        </div>
        <input
          type="text"
          className="tag-add-form__input"
          placeholder={t('tags.placeholder', 'Tên nhãn mới... (ví dụ: breakout, reversal, scalp)')}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          id="input-new-tag"
        />
        <button type="submit" className="btn btn--primary" disabled={!newName.trim()}>
          + {t('tags.add', 'Thêm nhãn')}
        </button>
      </form>

      {/* Tags list */}
      <div className="tags-grid">
        {tags.length === 0 ? (
          <div className="tags-empty">
            {t('tags.empty', 'Chưa có nhãn nào. Tạo nhãn đầu tiên!')}
          </div>
        ) : (
          tags.map((tag, idx) => (
            <div
              key={tag.id}
              className="tag-card"
              style={{ animationDelay: `${idx * 40}ms`, borderLeftColor: tag.color }}
            >
              {editingId === tag.id ? (
                <div className="tag-card__edit">
                  <div className="tag-card__edit-colors">
                    {TAG_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        className={`tag-color-btn tag-color-btn--sm ${editColor === c ? 'tag-color-btn--active' : ''}`}
                        style={{ background: c }}
                        onClick={() => setEditColor(c)}
                      />
                    ))}
                  </div>
                  <input
                    className="tag-card__edit-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(tag.id); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                  />
                  <div className="tag-card__edit-actions">
                    <button className="btn btn--primary btn--sm" onClick={() => saveEdit(tag.id)}>{t('journal.save', 'Lưu')}</button>
                    <button className="btn btn--secondary btn--sm" onClick={() => setEditingId(null)}>{t('tradeDetail.close', 'Hủy')}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="tag-card__info">
                    <span className="tag-card__dot" style={{ background: tag.color }} />
                    <span className="tag-card__name">{tag.name}</span>
                    <span className="tag-card__count">{tag.usageCount || 0} {t('calendar.trades', 'lệnh')}</span>
                  </div>
                  <div className="tag-card__actions">
                    <button className="btn btn--secondary btn--sm" onClick={() => startEdit(tag)}>{t('journal.edit', 'Sửa')}</button>
                    <button className="btn btn--danger btn--sm" onClick={() => handleDelete(tag.id)}>{t('journal.delete', 'Xóa')}</button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
