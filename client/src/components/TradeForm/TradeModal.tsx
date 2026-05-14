import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { tradeApi, playbookApi, tagsApi, rulesApi, getImageUrl, aiApi } from '../../services/api';

import type { Trade, TradeImage, Playbook, Tag, TradeRuleEntry, Rule } from '../../types';
import '../Rules/Rules.css';
import './TradeForm.css';



const INSTRUMENTS = [
  'NZD-CHF', 'EUR-USD', 'USD-JPY', 'AUD-NZD', 'NZD-CAD',
  'AUD-CAD', 'AUD-CHF', 'AUD-USD', 'EUR-JPY', 'USD-CAD',
  'EUR-AUD', 'EUR-CAD', 'EUR-CHF', 'NZD-USD', 'GBP-AUD',
  'GBP-JPY', 'GBP-NZD', 'NZD-JPY', 'GBP-CAD', 'XAU-USD',
  'GBP-CHF', 'EUR-GBP', 'GBP-USD', 'BTC-USD', 'ETH-USD',
  'CHF-JPY'
] as const;
interface TradeModalProps {
  trade: Trade | null;
  defaultDate: string;
  onSubmit: (data: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

export default function TradeModal({ trade, defaultDate, onSubmit, onClose }: TradeModalProps) {
  const { t } = useTranslation();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [existingImages, setExistingImages] = useState<TradeImage[]>(trade?.images || []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    date: trade?.date || defaultDate,
    instrument: trade?.instrument || '',
    side: trade?.side || 'LONG' as 'LONG' | 'SHORT',
    entryPrice: trade?.entryPrice?.toString() || '',
    exitPrice: trade?.exitPrice?.toString() || '',
    quantity: trade?.quantity?.toString() || '',
    pnl: trade?.pnl?.toString() || '',
    fees: trade?.fees?.toString() || '0',
    notes: trade?.notes || '',
    tags: trade?.tags?.join(', ') || '',
    stopLoss: trade?.stopLoss?.toString() || '',
    takeProfit: trade?.takeProfit?.toString() || '',
    rating: trade?.rating || 0,
    playbookId: trade?.playbookId || '',
    disciplineScore: trade?.disciplineScore || 0,
    isMissedTrade: trade?.isMissedTrade || false,
  });

  const [ruleChecklist, setRuleChecklist] = useState<TradeRuleEntry[]>(trade?.ruleChecklist || []);

  // Sync rule checklist with chosen playbook
  useEffect(() => {
    if (!form.playbookId) {
      if (!trade && ruleChecklist.length > 0) setRuleChecklist([]);
      return;
    }
    const playbook = playbooks.find(p => p.id === form.playbookId);
    if (playbook && playbook.setupRules && playbook.setupRules.length > 0) {
       const newChecklist = playbook.setupRules.map((ruleIdStr) => {
          const ruleObj = rules.find(r => r.id === ruleIdStr);
          const ruleName = ruleObj ? ruleObj.name : ruleIdStr;
          const existing = ruleChecklist.find(r => r.ruleId === ruleIdStr || r.ruleName === ruleName);
          return {
             ruleId: ruleIdStr,
             ruleName: ruleName,
             followed: existing ? existing.followed : false
          };
       });
       if (JSON.stringify(newChecklist) !== JSON.stringify(ruleChecklist)) {
          setRuleChecklist(newChecklist);
       }
    } else if (!trade && ruleChecklist.length > 0) {
       setRuleChecklist([]);
    }
  }, [form.playbookId, playbooks, rules]);

  // Auto compute discipline score based on rules if they exist
  useEffect(() => {
     if (form.playbookId && ruleChecklist.length > 0) {
        const followed = ruleChecklist.filter(r => r.followed).length;
        const total = ruleChecklist.length;
        const score = Math.round((followed / total) * 10);
        setForm(f => ({ ...f, disciplineScore: score }));
     }
  }, [ruleChecklist, form.playbookId, rules]);

  const [revengeWarning, setRevengeWarning] = useState(false);
  // initialBalance is removed to fix TS unused error

  // Fetch active rules and playbooks
  useEffect(() => {

    playbookApi.getAll().then(setPlaybooks).catch(console.error);

    tagsApi.getAll().then(setAvailableTags).catch(console.error);

    rulesApi.getAll().then(setRules).catch(console.error);

    if (!trade) {
       tradeApi.getAll().then(trades => {
          const closed = trades.filter(t => t.pnl !== 0);
          closed.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          if (closed.length > 0 && closed[0].pnl < 0) {
             const diff = new Date().getTime() - new Date(closed[0].createdAt).getTime();
             if (diff < 3600000 * 2) { // Last trade was loss within 2 hours
                 setRevengeWarning(true);
             }
          }
       }).catch(console.error);
    }
  }, [trade]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalCount = existingImages.length + newFiles.length + files.length;
    if (totalCount > 10) {
      alert(`Maximum 10 images per trade. You already have ${existingImages.length + newFiles.length}.`);
      return;
    }
    setNewFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (imageId: string) => {
    if (!trade) return;
    try {
      await tradeApi.deleteImage(trade.id, imageId);
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err) {
      console.error('Failed to delete image:', err);
    }
  };

  // Compute R:R
  const entryP = parseFloat(form.entryPrice) || 0;
  const slP = parseFloat(form.stopLoss) || 0;
  const tpP = parseFloat(form.takeProfit) || 0;
  const risk = slP > 0 ? Math.abs(entryP - slP) : 0;
  const reward = tpP > 0 ? Math.abs(tpP - entryP) : 0;
  const rrRatio = risk > 0 && reward > 0 ? (reward / risk).toFixed(2) : '—';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const tradeData: any = {
        date: form.date,
        instrument: form.instrument,
        side: form.side as 'LONG' | 'SHORT',
        entryPrice: parseFloat(form.entryPrice) || 0,
        exitPrice: parseFloat(form.exitPrice) || 0,
        quantity: parseFloat(form.quantity) || 0,
        pnl: parseFloat(form.pnl) || 0,
        fees: parseFloat(form.fees) || 0,
        notes: form.notes,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        images: existingImages,
        ruleChecklist,
        stopLoss: parseFloat(form.stopLoss) || 0,
        takeProfit: parseFloat(form.takeProfit) || 0,
        rating: form.rating,
        disciplineScore: form.disciplineScore,
        isMissedTrade: form.isMissedTrade,
        playbookId: form.playbookId,
        reviewNotes: trade?.reviewNotes || '',
        mistakes: trade?.mistakes || '',
        lessons: trade?.lessons || '',
      };

      if (form.isMissedTrade) {
         tradeData.pnl = 0;
         tradeData.exitPrice = tradeData.entryPrice;
      }

      if (trade && newFiles.length > 0) {
        await tradeApi.uploadImages(trade.id, newFiles);
      }

      await onSubmit(tradeData);
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setUploading(false);
    }
  };


  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    const totalCount = existingImages.length + newFiles.length + files.length;
    if (totalCount > 10) {
      alert(`Maximum 10 images per trade.`);
      return;
    }
    setNewFiles(prev => [...prev, ...files]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const analyzeImageWithAI = async () => {
    if (newFiles.length === 0) {
      alert('Vui lòng chọn hoặc kéo thả ít nhất 1 ảnh mới để AI phân tích.');
      return;
    }
    setAnalyzingImage(true);
    try {
      // Đọc file mới nhất thành base64
      const file = newFiles[newFiles.length - 1];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        const tryVisionApi = async (retryCount = 0) => {
          try {
            const aiData = await aiApi.vision(base64data);
            setForm(f => ({
              ...f,
              instrument: aiData.instrument || f.instrument,
              side: aiData.side || f.side,
              entryPrice: aiData.entryPrice ? String(aiData.entryPrice) : f.entryPrice,
              stopLoss: aiData.stopLoss ? String(aiData.stopLoss) : f.stopLoss,
              takeProfit: aiData.takeProfit ? String(aiData.takeProfit) : f.takeProfit,
            }));
            alert('🤖 AI đã phân tích và điền thông tin thành công!');
            setAnalyzingImage(false);
          } catch(e: any) {
            const errMsg = String(e?.message || e);
            if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota')) {
              if (retryCount < 1) {
                alert('Hệ thống đang quá tải, vui lòng đợi 30 giây rồi thử lại.');
                setTimeout(() => tryVisionApi(retryCount + 1), 30000);
              } else {
                alert('Hệ thống vẫn đang quá tải. Vui lòng quay lại sau ít phút.');
                setAnalyzingImage(false);
              }
            } else {
              alert('AI không tìm thấy thông tin hoặc API lỗi. Chi tiết: ' + errMsg);
              setAnalyzingImage(false);
            }
          }
        };

        tryVisionApi();
      };
      reader.readAsDataURL(file);
    } catch (e) {
      alert('Lỗi phân tích AI: ' + e);
      setAnalyzingImage(false);
    }
  };

  useEffect(() => {
    const formEl = document.getElementById('trade-form');
    if (formEl) {
      (formEl as any).__pendingFiles = newFiles;
    }
  }, [newFiles]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">
            {trade ? t('tradeForm.editTrade') : t('tradeForm.addTrade')}
          </h2>
          <button className="modal__close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          <form id="trade-form" className="trade-form" onSubmit={handleSubmit}>
            <div className="trade-form__grid-2">
              <div className="trade-form__field">
                <label className="trade-form__label">{t('tradeForm.date')}</label>
                <input type="date" name="date" className="trade-form__input" value={form.date} onChange={handleChange} required />
              </div>
              <div className="trade-form__field">
                <label className="trade-form__label">{t('tradeForm.instrument')}</label>
                <select name="instrument" className="trade-form__select" value={form.instrument} onChange={handleChange} required>
                  <option value="" disabled>{t('tradeForm.placeholder.instrument')}</option>
                  {INSTRUMENTS.map(pair => (
                    <option key={pair} value={pair}>{pair}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="trade-form__grid-2">
              <div className="trade-form__field">
                <label className="trade-form__label">{t('tradeForm.side', 'Vị thế')}</label>
                <select name="side" className="trade-form__select" value={form.side} onChange={handleChange}>
                  <option value="LONG">{t('tradeForm.long', 'LONG')}</option>
                  <option value="SHORT">{t('tradeForm.short', 'SHORT')}</option>
                </select>
              </div>
              <div className="trade-form__field">
                <label className="trade-form__label">{t('tradeForm.quantity', 'Khối lượng')}</label>
                <input type="number" name="quantity" className="trade-form__input" value={form.quantity} onChange={handleChange} step="any" min="0" required />
              </div>
            </div>

            {revengeWarning && (
              <div className="trade-form__row" style={{ marginTop: 0, marginBottom: 0 }}>
                <div style={{ background: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff4444', padding: '12px 16px', borderRadius: 8, fontSize: 13, width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>⚠️</span>
                  <div style={{ lineHeight: 1.4 }}>
                    <strong style={{ display: 'block', marginBottom: 2 }}>{t('tradeForm.revengeWarning', 'Cảnh báo Revenge Trading:')}</strong> 
                    {t('tradeForm.revengeDesc', 'Lệnh trước đó của bạn vừa bị lỗ trong vòng 2 giờ qua. Việc vào lệnh lúc này có thể là do tâm lý bốc đồng bực tức. Hãy kiểm tra thật kỹ!')}
                  </div>
                </div>
              </div>
            )}

            <div className="trade-form__grid-3">
              <div className="trade-form__field">
                <label className="trade-form__label">{t('tradeForm.entry')}</label>
                <input type="number" name="entryPrice" className="trade-form__input" value={form.entryPrice} onChange={handleChange} step="any" min="0" required />
              </div>
              <div className="trade-form__field">
                <label className="trade-form__label">{t('tradeForm.sl')}</label>
                <input type="number" name="stopLoss" className="trade-form__input" value={form.stopLoss} onChange={handleChange} step="any" min="0" placeholder="0" />
              </div>
              <div className="trade-form__field">
                <label className="trade-form__label">{t('tradeForm.tp')}</label>
                <input type="number" name="takeProfit" className="trade-form__input" value={form.takeProfit} onChange={handleChange} step="any" min="0" placeholder="0" />
              </div>
            </div>

            <div className="trade-form__grid-3">
              <div className="trade-form__field">
                <label className="trade-form__label" style={{ whiteSpace: 'nowrap' }}>{t('tradeForm.rr')}</label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '42px', width: '100%', boxSizing: 'border-box', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <span className={`rr-value ${rrRatio !== '—' ? (parseFloat(rrRatio) >= 1 ? 'rr-value--good' : 'rr-value--bad') : ''}`}>
                    {rrRatio === '—' ? '—' : `${rrRatio}`}
                  </span>
                </div>
              </div>
              <div className="trade-form__field">
                <label className="trade-form__label" style={{ whiteSpace: 'nowrap' }}>{t('tradeForm.pnl')}</label>
                <input type="number" name="pnl" className="trade-form__input" value={form.pnl} onChange={handleChange} step="any" required style={{ fontSize: '1.05rem', fontWeight: 600, color: form.pnl === '0' || !form.pnl ? 'inherit' : (parseFloat(form.pnl) < 0 ? '#ff4444' : '#3fb950') }}/>
              </div>
              <div className="trade-form__field">
                <label className="trade-form__label" style={{ whiteSpace: 'nowrap' }}>{t('tradeForm.fees', 'Fee ($)')}</label>
                <input type="number" name="fees" className="trade-form__input" value={form.fees} onChange={handleChange} step="any" min="0" />
              </div>
            </div>

            <div className="trade-form__grid-2">
              <div className="trade-form__field">
                <label className="trade-form__label">{t('tradeForm.playbook')}</label>
                <select name="playbookId" className="trade-form__select" value={form.playbookId} onChange={handleChange}>
                  <option value="">{t('tradeForm.none', 'Không có')}</option>
                  {playbooks.map(pb => (
                    <option key={pb.id} value={pb.id}>{pb.name}</option>
                  ))}
                </select>
              </div>
              <div className="trade-form__field">
                <label className="trade-form__label">{t('tradeForm.rating', 'Đánh giá (Sự hài lòng)')}</label>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '42px', width: '100%', boxSizing: 'border-box', background: '#ffffff', padding: '0 12px', borderRadius: 8, border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div className="star-rating" style={{ display: 'inline-flex' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${form.rating >= star ? 'star-btn--active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, rating: f.rating === star ? 0 : star }))}
                    >★</button>
                  ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="trade-form__row">
              <div className="trade-form__field trade-form__field--full">
                <label className="trade-form__label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('tradeForm.discipline', 'Điểm Kỷ Luật (Discipline Score)')} {ruleChecklist.length > 0 ? <span style={{ color: '#58a6ff', fontSize: 12, fontWeight: 'normal' }}>{t('tradeForm.disciplineAutoCalc', '(Tự động tính dựa trên quy tắc)')}</span> : ''}</span>
                  <span style={{ color: form.disciplineScore >= 8 ? '#3fb950' : (form.disciplineScore >= 5 ? '#d29922' : '#f85149'), fontWeight: 'bold' }}>
                    {form.disciplineScore}/10
                  </span>
                </label>
                
                {ruleChecklist.length > 0 ? (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10, background: '#ffffff', padding: 15, borderRadius: 8, border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                     {ruleChecklist.map((rule, idx) => (
                       <label key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', transition: 'all 0.2s ease', opacity: rule.followed ? 1 : 0.6 }}>
                          <input 
                            type="checkbox" 
                            checked={rule.followed} 
                            onChange={(e) => {
                               const updated = [...ruleChecklist];
                               updated[idx].followed = e.target.checked;
                               setRuleChecklist(updated);
                            }}
                            style={{ minWidth: 18, minHeight: 18, cursor: 'pointer', marginTop: 2, accentColor: '#3fb950' }}
                          />
                          <span>{rule.ruleName}</span>
                       </label>
                     ))}
                   </div>
                ) : (
                   <>
                    <input 
                      type="range" 
                      min="0" 
                      max="10" 
                      step="1" 
                      value={form.disciplineScore} 
                      onChange={e => setForm(f => ({ ...f, disciplineScore: parseInt(e.target.value) }))}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      <span>{t('tradeForm.scoreBad', 'Tệ (0)')}</span>
                      <span>{t('tradeForm.scoreNormal', 'Bình thường (5)')}</span>
                      <span>{t('tradeForm.scorePerfect', 'Tuyệt đối (10)')}</span>
                    </div>
                   </>
                )}
              </div>
            </div>

            <div className="trade-form__field trade-form__field--full">
              <label className="trade-form__label">{t('tradeForm.tags')}</label>
              {availableTags.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  {availableTags.map(t => {
                    const isSelected = form.tags.split(',').map(x => x.trim()).filter(Boolean).includes(t.name);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          let tagsArray = form.tags.split(',').map(x => x.trim()).filter(Boolean);
                          if (isSelected) {
                            tagsArray = tagsArray.filter(x => x !== t.name);
                          } else {
                            tagsArray.push(t.name);
                          }
                          setForm(f => ({ ...f, tags: tagsArray.join(', ') }));
                        }}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? t.color : 'transparent',
                          color: isSelected ? '#fff' : t.color,
                          border: `1px solid ${t.color}`,
                          transition: 'all 0.2s ease',
                          opacity: isSelected ? 1 : 0.7
                        }}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('tags.empty', 'Chưa có nhãn nào. Hãy thêm ở phân mục Nhãn')}</span>
              )}
            </div>


            {/* Images Section */}
            <div className="trade-form__field trade-form__field--full">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <label className="trade-form__label">
                  {t('tradeForm.images')} ({existingImages.length + newFiles.length}/10)
                </label>
                <button 
                  type="button" 
                  className="btn btn--secondary" 
                  style={{fontSize: 12, padding: '4px 8px'}} 
                  onClick={analyzeImageWithAI}
                  disabled={analyzingImage || newFiles.length === 0}
                >
                  {analyzingImage ? `🤖 ${t('tradeForm.aiScanning', 'Đang quét...')}` : `🔮 ${t('tradeForm.aiScanLabel', 'Quét & Điền Auto (AI)')}`}
                </button>
              </div>

              {existingImages.length > 0 && (
                <div className="image-thumbs">
                  {existingImages.map(img => (
                    <div key={img.id} className="image-thumb">
                      <img src={getImageUrl(img)} alt={img.originalName} className="image-thumb__img" />
                      <button type="button" className="image-thumb__remove" onClick={() => removeExistingImage(img.id)} title="Remove image">×</button>
                    </div>
                  ))}
                </div>
              )}

              {newFiles.length > 0 && (
                <div className="image-thumbs">
                  {newFiles.map((file, i) => (
                    <div key={i} className="image-thumb image-thumb--new">
                      <img src={URL.createObjectURL(file)} alt={file.name} className="image-thumb__img" />
                      <button type="button" className="image-thumb__remove" onClick={() => removeNewFile(i)} title="Remove">×</button>
                      <span className="image-thumb__badge">NEW</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="image-dropzone" onClick={() => fileInputRef.current?.click()} onDrop={handleDrop} onDragOver={handleDragOver}>
                <span className="image-dropzone__icon">📷</span>
                <span className="image-dropzone__text">{t('tradeForm.uploadMissing')}</span>
                <span className="image-dropzone__hint">JPEG, PNG, GIF, WebP • max 5MB</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
            </div>

            <div className="trade-form__field trade-form__field--full">
              <label className="trade-form__label">{t('tradeForm.notes')}</label>
              <textarea name="notes" className="trade-form__textarea" value={form.notes} onChange={handleChange} placeholder={t('tradeForm.placeholder.notes')} />
            </div>

            <div className="trade-form__actions">
              <button type="button" className="btn btn--secondary" onClick={onClose}>{t('tradeForm.cancel')}</button>
              <button type="submit" className="btn btn--primary" disabled={uploading}>
                {uploading ? '...' : trade ? t('tradeForm.editTrade') : t('tradeForm.addTrade')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
