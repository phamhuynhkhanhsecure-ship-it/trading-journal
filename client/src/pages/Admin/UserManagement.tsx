import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../services/api';
import type { User, Group } from '../../types';
import './UserManagement.css';
import AuditLogsModal from './AuditLogsModal';
import GroupManagement from './GroupManagement';
import RoleManagement from './RoleManagement';

export default function UserManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'roles'>('users');
  
  const [users, setUsers] = useState<User[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditTargetEmail, setAuditTargetEmail] = useState<string | undefined>();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, groupsData] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getGroups()
      ]);
      setUsers(usersData);
      setAvailableGroups(groupsData || []);
    } catch (err: any) {
      setError(err.message || t('admin.noPermission'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchData();
    }
  }, [activeTab]);

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setSelectedGroups([...(user.groupIds || [])]);
  };

  const toggleGroup = (group: string) => {
    if (selectedGroups.includes(group)) {
      setSelectedGroups(selectedGroups.filter(g => g !== group));
    } else {
      setSelectedGroups([...selectedGroups, group]);
    }
  };

  const handleSave = async () => {
    if (!editingUser) return;
    try {
      setIsSaving(true);
      await adminApi.updateUserGroups(editingUser.email, selectedGroups);
      setUsers(users.map(u => u.email === editingUser.email ? { ...u, groupIds: selectedGroups } : u));
      setEditingUser(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-users-page">
      <div className="admin-header">
        <h1>{t('admin.title')}</h1>
      </div>

      <div className="admin-tabs-nav">
        <button className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 {t('admin.tabUsers')}</button>
        <button className={`admin-tab-btn ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>🏢 {t('admin.tabGroups')}</button>
        <button className={`admin-tab-btn ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}>🔑 {t('admin.tabRoles')}</button>
      </div>

      {activeTab === 'users' && (
        <div className="admin-tab-content fade-in">
          <div className="admin-actions" style={{ justifyContent: 'flex-end', marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
            <button className="btn-save" onClick={() => { setAuditTargetEmail(undefined); setShowAuditModal(true); }}>
              <span className="icon" style={{marginRight: '6px'}}>📜</span> {t('admin.users.history')}
            </button>
            <button className="btn-save outline" onClick={fetchData}>
              <span className="icon" style={{marginRight: '6px'}}>🔄</span> {t('admin.reload')}
            </button>
          </div>

          {loading ? (
            <div className="loading-state">{t('admin.loading')}</div>
          ) : error ? (
            <div className="error-message"><p>⚠️ {error}</p></div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.users.name')}</th>
                    <th>{t('admin.users.groups')}</th>
                    <th>{t('admin.users.lastLogin')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(users || []).map(user => (
                    <tr key={user.email}>
                      <td>
                        <div className="user-cell">
                          {user.avatar ? (
                            <img src={user.avatar} alt="avatar" className="user-avatar" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="user-avatar-fallback">{user.email.charAt(0).toUpperCase()}</div>
                          )}
                          <div className="user-info">
                            <span className="user-name">{user.name || 'No Name'}</span>
                            <span className="user-email">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {(user.groupIds || []).map(groupId => {
                          const groupName = availableGroups.find(g => g.id === groupId)?.name || groupId;
                          return (
                            <span key={groupId} className="role-badge user">
                              {groupName}
                            </span>
                          );
                        })}
                      </td>
                      <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'nowrap', alignItems: 'center' }}>
                          <button className="edit-btn" onClick={() => openEditModal(user)} title={t('admin.users.editGroups')}>
                            <span style={{marginRight: '4px'}}>✏️</span> {t('admin.users.editGroups')}
                          </button>
                          <button className="edit-btn history" onClick={() => { setAuditTargetEmail(user.email); setShowAuditModal(true); }} title={t('admin.users.history')}>
                            <span style={{marginRight: '4px'}}>⏱️</span> {t('admin.users.history')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="admin-tab-content fade-in">
          <GroupManagement />
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="admin-tab-content fade-in">
          <RoleManagement />
        </div>
      )}

      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{t('admin.users.editGroupsTitle')}: {editingUser.name}</h3>
              <button className="close-btn" onClick={() => setEditingUser(null)}>&times;</button>
            </div>
            <div className="modal-body">
              {availableGroups.length > 0 ? (
                <div className="selection-grid">
                  {availableGroups.map(group => {
                    const isActive = selectedGroups.includes(group.id);
                    return (
                      <div 
                        key={group.id} 
                        className={`selection-item ${isActive ? 'active' : ''}`}
                        onClick={() => toggleGroup(group.id)}
                        style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px', padding: '1.25rem' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                          <div className="checkbox-icon"></div>
                          <span className="role-title" style={{ fontWeight: 800 }}>{group.name}</span>
                        </div>
                        {group.description && (
                          <span className="role-desc" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>
                            {group.description}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-data-msg" style={{ textAlign: 'center', padding: '2rem' }}>
                  <p>{t('admin.groups.errorLoad')}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setEditingUser(null)}>{t('admin.cancel')}</button>
              <button className="btn-save" onClick={handleSave} disabled={isSaving}>
                {isSaving ? t('admin.saving') : t('admin.users.saveGroups')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuditModal && (
        <AuditLogsModal 
          targetEntityId={auditTargetEmail} 
          onClose={() => setShowAuditModal(false)} 
        />
      )}
    </div>
  );
}
