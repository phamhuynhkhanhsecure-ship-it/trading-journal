import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auditApi, type AuditLog } from '../../services/api';
import './AuditLogsModal.css';

interface AuditLogsModalProps {
  onClose: () => void;
  targetEntityId?: string;
}

const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ onClose, targetEntityId }) => {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs(page);
  }, [page, targetEntityId]);

  const fetchLogs = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await auditApi.getAuditLogs({ page: pageNum, size: 10, targetEntityId });
      setLogs(res.content || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const renderTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
    return (
      <div className="audit-timestamp">
        <span className="audit-time">
          {date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <span className="audit-date">
          {date.toLocaleDateString(locale)}
        </span>
      </div>
    );
  };

  return (
    <div className="audit-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="audit-modal-content">
        <div className="audit-modal-header">
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{t('admin.audit.title')}</h2>
          <button className="btn-cancel" onClick={onClose} style={{ padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifySelf: 'center' }}>
            ✕
          </button>
        </div>
        
        <div className="audit-modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div className="spinner"></div>
              <p>{t('admin.audit.loading')}</p>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</span>
              <p>{t('admin.audit.empty')}</p>
            </div>
          ) : (
            <table className="audit-table">
              <thead>
                <tr>
                  <th>{t('admin.audit.colTime')}</th>
                  <th>{t('admin.audit.colPerformer')}</th>
                  <th>{t('admin.audit.colAction')}</th>
                  <th>{t('admin.audit.colTarget')}</th>
                  <th>{t('admin.audit.colDetails')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="audit-row">
                    <td>{renderTimestamp(log.timestamp)}</td>
                    <td>
                      <div className="audit-performer" title={log.performedBy}>
                        {log.performedBy}
                      </div>
                    </td>
                    <td>
                      <span className="audit-action-badge">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="target-cell">
                        <span style={{ fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{log.targetEntity}</span>
                        {log.targetEntityId && log.targetEntityId !== 'null' && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>ID: {log.targetEntityId}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="audit-details">{log.details}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('admin.audit.pageInfo', { current: page + 1, total: totalPages })}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn-cancel"
                disabled={page === 0} 
                onClick={() => setPage(p => p - 1)}>
                ← {t('admin.audit.prev')}
              </button>
              <button 
                className="btn-cancel"
                disabled={page >= totalPages - 1} 
                onClick={() => setPage(p => p + 1)}>
                {t('admin.audit.next')} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsModal;
