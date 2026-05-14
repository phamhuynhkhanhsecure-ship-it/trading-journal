import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../services/api';
import type { Role, Permission } from '../../types';
import './Admin.css';

const AVAILABLE_MENUS = [
  { id: 'nav-calendar', labelKey: 'admin.menus.calendar' },
  { id: 'nav-analytics', labelKey: 'admin.menus.analytics' },
  { id: 'nav-journal', labelKey: 'admin.menus.journal' },
  { id: 'nav-calculator', labelKey: 'admin.menus.calculator' },
  { id: 'nav-playbook', labelKey: 'admin.menus.playbook' },
  { id: 'nav-rules', labelKey: 'admin.menus.rules' },
  { id: 'nav-tags', labelKey: 'admin.menus.tags' },
  { id: 'nav-gallery', labelKey: 'admin.menus.gallery' },
  { id: 'nav-admin-users', labelKey: 'admin.menus.adminUsers' }
];

export default function RoleManagement() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<Partial<Role>>({ name: '', description: '', permissions: [] });
  const [isSaving, setIsSaving] = useState(false);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getRoles();
      setRoles(data || []);
    } catch (err: any) {
      setError(err.message || t('admin.roles.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({ name: role.name, description: role.description, permissions: [...role.permissions] });
    } else {
      setEditingRole(null);
      setFormData({ name: '', description: '', permissions: [{ permissionName: '', assignedMenuIds: [], apiLines: [] }] });
    }
    setIsModalOpen(true);
  };

  const addPermissionBlock = () => {
    setFormData({
      ...formData,
      permissions: [...(formData.permissions || []), { permissionName: '', assignedMenuIds: [], apiLines: [] }]
    });
  };

  const updatePermission = (index: number, field: keyof Permission, value: any) => {
    const current = [...(formData.permissions || [])];
    current[index] = { ...current[index], [field]: value };
    setFormData({ ...formData, permissions: current });
  };

  const removePermission = (index: number) => {
    const current = [...(formData.permissions || [])];
    current.splice(index, 1);
    setFormData({ ...formData, permissions: current });
  };

  const toggleMenu = (pIndex: number, menuId: string) => {
    const current = [...(formData.permissions || [])];
    const menuIds = [...(current[pIndex].assignedMenuIds || [])];
    if (menuIds.includes(menuId)) {
      current[pIndex].assignedMenuIds = menuIds.filter(id => id !== menuId);
    } else {
      current[pIndex].assignedMenuIds = [...menuIds, menuId];
    }
    setFormData({ ...formData, permissions: current });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      setIsSaving(true);
      if (editingRole) {
        await adminApi.updateRole(editingRole.id, formData);
      } else {
        await adminApi.createRole(formData);
      }
      setIsModalOpen(false);
      fetchRoles();
    } catch (err: any) {
      alert(t('admin.roles.errorSave') + ': ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('admin.deleteConfirm'))) return;
    try {
      await adminApi.deleteRole(id);
      fetchRoles();
    } catch (err: any) {
      alert(t('admin.roles.errorDelete') + ': ' + err.message);
    }
  };

  if (loading) return <div className="admin-page">{t('admin.loading')}</div>;
  if (error) return <div className="admin-page"><div className="error-message">⚠️ {error}</div></div>;

  return (
    <div style={{ width: '100%' }}>
      <div className="admin-actions" style={{ justifyContent: 'flex-end', marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button className="btn-save" onClick={() => handleOpenModal()}>
          <span>➕</span> {t('admin.roles.addRole')}
        </button>
        <button className="btn-cancel" onClick={fetchRoles}>
          <span>🔄</span> {t('admin.reload')}
        </button>
      </div>
      
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.roles.name')}</th>
              <th>{t('admin.roles.description')}</th>
              <th>{t('admin.roles.permCount')}</th>
              <th>{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.id}>
                <td><strong>{r.name}</strong></td>
                <td>{r.description}</td>
                <td><span className="role-badge">{r.permissions?.length || 0} {t('admin.roles.permissions')}</span></td>
                <td>
                  <button className="btn-edit" onClick={() => handleOpenModal(r)}>✏️ {t('admin.roles.edit')}</button>
                  <button className="btn-delete" onClick={() => handleDelete(r.id)}>🗑️ {t('admin.roles.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-large" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>{editingRole ? `${t('admin.roles.editTitle')}: ${editingRole.name}` : t('admin.roles.addTitle')}</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{t('admin.roles.nameLabel')}</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={formData.name || ''} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('admin.roles.descLabel')}</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={formData.description || ''} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>{t('admin.roles.permConfig')}</label>
                    <button type="button" className="btn-edit" onClick={addPermissionBlock} style={{ padding: '0.4rem 0.8rem' }}>
                      {t('admin.roles.addPerm')}
                    </button>
                  </div>

                  {(!formData.permissions || formData.permissions.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-tertiary)', borderRadius: '16px', border: '2px dashed var(--border-primary)' }}>
                      <p style={{ color: 'var(--text-tertiary)' }}>{t('admin.roles.noPerm')}</p>
                    </div>
                  ) : (
                    formData.permissions.map((perm, pIndex) => (
                      <div key={pIndex} className="permission-card">
                        <div className="permission-card-header">
                          <span style={{ fontWeight: 800 }}>{t('admin.roles.permBlock')} #{pIndex + 1}</span>
                          <button type="button" className="btn-delete" onClick={() => removePermission(pIndex)} style={{ padding: '0.3rem 0.6rem' }}>
                            {t('admin.roles.deletePerm')}
                          </button>
                        </div>
                        <div className="permission-card-body">
                          <div className="form-group">
                            <label>Permission Name (Resource ID)</label>
                            <input 
                              type="text" 
                              className="form-control"
                              placeholder="e.g. USER_READ, ORDER_WRITE"
                              value={perm.permissionName}
                              onChange={e => updatePermission(pIndex, 'permissionName', e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label>{t('admin.roles.menuLabel')}</label>
                            <div className="selection-grid">
                              {AVAILABLE_MENUS.map(menu => {
                                const isActive = (perm.assignedMenuIds || []).includes(menu.id);
                                return (
                                  <div 
                                    key={menu.id} 
                                    className={`selection-item ${isActive ? 'active' : ''}`}
                                    onClick={() => toggleMenu(pIndex, menu.id)}
                                  >
                                    <div className="checkbox-icon"></div>
                                    <span style={{ fontSize: '0.8rem' }}>{t(menu.labelKey)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>{t('admin.cancel')}</button>
                <button type="submit" className="btn-save" disabled={isSaving}>
                  {isSaving ? t('admin.saving') : t('admin.roles.saveRole')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
