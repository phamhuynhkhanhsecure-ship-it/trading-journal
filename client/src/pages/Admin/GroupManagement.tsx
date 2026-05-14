import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../services/api';
import type { Group, Role } from '../../types';
import './Admin.css';

export default function GroupManagement() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState<Partial<Group>>({ name: '', description: '', roleIds: [] });
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsData, rolesData] = await Promise.all([
        adminApi.getGroups(),
        adminApi.getRoles()
      ]);
      setGroups(groupsData || []);
      setAvailableRoles(rolesData || []);
    } catch (err: any) {
      setError(err.message || t('admin.groups.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setFormData({ name: group.name, description: group.description, roleIds: [...group.roleIds] });
    } else {
      setEditingGroup(null);
      setFormData({ name: '', description: '', roleIds: [] });
    }
    setIsModalOpen(true);
  };

  const toggleRole = (roleId: string) => {
    const currentRoles = formData.roleIds || [];
    if (currentRoles.includes(roleId)) {
      setFormData({ ...formData, roleIds: currentRoles.filter(id => id !== roleId) });
    } else {
      setFormData({ ...formData, roleIds: [...currentRoles, roleId] });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      setIsSaving(true);
      if (editingGroup) {
        await adminApi.updateGroup(editingGroup.id, formData);
      } else {
        await adminApi.createGroup(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(t('admin.groups.errorSave') + ': ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('admin.groups.deleteConfirm'))) return;
    try {
      await adminApi.deleteGroup(id);
      fetchData();
    } catch (err: any) {
      alert(t('admin.groups.errorDelete') + ': ' + err.message);
    }
  };

  if (loading) return <div className="admin-page">{t('admin.loading')}</div>;
  if (error) return <div className="admin-page"><div className="error-message">⚠️ {error}</div></div>;

  return (
    <div style={{ width: '100%' }}>
      <div className="admin-actions" style={{ justifyContent: 'flex-end', marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button className="btn-save" onClick={() => handleOpenModal()}>
          <span>➕</span> {t('admin.groups.addGroup')}
        </button>
        <button className="btn-cancel" onClick={fetchData}>
          <span>🔄</span> {t('admin.reload')}
        </button>
      </div>
      
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.groups.name')}</th>
              <th>{t('admin.groups.description')}</th>
              <th>{t('admin.groups.roles')}</th>
              <th>{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <tr key={g.id}>
                <td><strong>{g.name}</strong></td>
                <td>{g.description}</td>
                <td>
                  <div className="badge-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {g.roleIds?.map(rid => {
                      const roleName = availableRoles.find(r => r.id === rid)?.name || rid;
                      return <span key={rid} className="role-badge">{roleName}</span>;
                    })}
                  </div>
                </td>
                <td>
                  <button className="btn-edit" onClick={() => handleOpenModal(g)}>✏️ {t('admin.users.editGroups')}</button>
                  <button className="btn-delete" onClick={() => handleDelete(g.id)}>🗑️ {t('admin.users.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingGroup ? `${t('admin.groups.editTitle')}: ${editingGroup.name}` : t('admin.groups.addTitle')}</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{t('admin.groups.nameLabel')}</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Enter group name..."
                    value={formData.name || ''} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('admin.groups.descLabel')}</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Briefly describe this group..."
                    value={formData.description || ''} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('admin.groups.assignRoles')}</label>
                  <div className="selection-grid">
                    {availableRoles.map(role => {
                      const isActive = (formData.roleIds || []).includes(role.id);
                      return (
                        <div 
                          key={role.id} 
                          className={`selection-item ${isActive ? 'active' : ''}`}
                          onClick={() => toggleRole(role.id)}
                        >
                          <div className="checkbox-icon"></div>
                          <span className="role-title">{role.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>{t('admin.cancel')}</button>
                <button type="submit" className="btn-save" disabled={isSaving}>
                  {isSaving ? t('admin.saving') : t('admin.groups.saveGroup')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
