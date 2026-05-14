import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import PreMarketRoutine from '../Journal/PreMarketRoutine';
import { journalApi } from '../../services/api';
import { Can } from '../Can/Can';
import './Layout.css';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { isBlindMode, toggleBlindMode } = useSettings();
  const [showPreMarket, setShowPreMarket] = useState(false);
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  useEffect(() => {
    const checkPreMarketRoutine = async () => {
      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        const entry = await journalApi.getByDate(todayStr);
        if (!entry || !(entry as any).isChecklistDone) {
          setShowPreMarket(true);
        }
      } catch (err) {
        console.error('Failed to check pre-market status', err);
      }
    };
    checkPreMarketRoutine();
  }, []);

  const handleCompletePreMarket = async () => {
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const entry = await journalApi.getByDate(todayStr);
      await journalApi.save({ 
        date: todayStr, 
        content: entry?.content || '',
        mood: entry?.mood || 'neutral',
        preMarketNotes: entry?.preMarketNotes || '',
        postMarketNotes: entry?.postMarketNotes || '',
        marketCondition: entry?.marketCondition || '',
        isChecklistDone: true 
      } as any);
      setShowPreMarket(false);
    } catch(err) {
      console.error(err);
    }
  };
  return (
    <div className="app-layout">
      {showPreMarket && <PreMarketRoutine onComplete={handleCompletePreMarket} />}
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <div className="sidebar__logo-icon">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3fb950" />
                    <stop offset="100%" stopColor="#58a6ff" />
                  </linearGradient>
                </defs>
                <path d="M4 24 L10 18 L16 21 L22 10 L28 6" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M24 6 L28 6 L28 10" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="28" cy="6" r="2.5" fill="#3fb950" className="logo-pulse" />
              </svg>
            </div>
            <span className="sidebar__logo-text">TradeJournal</span>
          </div>
          <button
            className="sidebar__toggle"
            onClick={() => setCollapsed(c => !c)}
            aria-label="Toggle sidebar"
            id="btn-toggle-sidebar"
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <div className="sidebar__user">
          {user?.picture ? (
            <img src={user.picture} alt="Avatar" className="sidebar__user-avatar" referrerPolicy="no-referrer" />
          ) : (
            <div className="sidebar__user-avatar-fallback">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
          )}
          {!collapsed && (
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.name || 'User'}</span>
              <span className="sidebar__user-email" title={user?.email}>{user?.email}</span>
            </div>
          )}
          {!collapsed && (
            <button className="sidebar__logout-btn" onClick={logout} title={t('layout.logout') || 'Đăng xuất'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          )}
        </div>

        <nav className="sidebar__nav">
          <div className="nav-group-title">{!collapsed ? t('layout.core') : '⋯'}</div>
          <Can permission="nav-calendar">
            <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`} id="nav-calendar">
              <span className="nav-item__icon">📅</span>
              <span className="nav-item__label">{t('layout.calendar')}</span>
            </NavLink>
          </Can>
          <Can permission="nav-analytics">
            <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`} id="nav-analytics">
              <span className="nav-item__icon">📊</span>
              <span className="nav-item__label">{t('layout.analytics')}</span>
            </NavLink>
          </Can>
          <Can permission="nav-journal">
            <NavLink to="/journal" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`} id="nav-journal">
              <span className="nav-item__icon">📓</span>
              <span className="nav-item__label">{t('layout.journal')}</span>
            </NavLink>
          </Can>
          <Can permission="nav-calculator">
            <NavLink to="/calculator" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`} id="nav-calculator">
              <span className="nav-item__icon">🧮</span>
              <span className="nav-item__label">{t('layout.calculator')}</span>
            </NavLink>
          </Can>

          <div className="nav-separator" />
          <div className="nav-group-title">{!collapsed ? t('layout.library') : '⋯'}</div>
          
          <Can permission="nav-playbook">
            <NavLink to="/playbook" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`} id="nav-playbook">
              <span className="nav-item__icon">📱</span>
              <span className="nav-item__label">{t('layout.playbook')}</span>
            </NavLink>
          </Can>
          <Can permission="nav-rules">
            <NavLink to="/rules" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`} id="nav-rules">
              <span className="nav-item__icon">📋</span>
              <span className="nav-item__label">{t('layout.rules')}</span>
            </NavLink>
          </Can>
          <Can permission="nav-tags">
            <NavLink to="/tags" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`} id="nav-tags">
              <span className="nav-item__icon">🏷️</span>
              <span className="nav-item__label">{t('layout.tags')}</span>
            </NavLink>
          </Can>
          <Can permission="nav-gallery">
            <NavLink to="/gallery" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`} id="nav-gallery">
              <span className="nav-item__icon">🖼️</span>
              <span className="nav-item__label">{t('layout.gallery')}</span>
            </NavLink>
          </Can>
          
          {/* SYSTEM section - only show when there are items to display */}
          {(user?.permissions?.includes('nav-admin-users') || 
            user?.permissions?.includes('nav-admin-groups') || 
            user?.permissions?.includes('nav-admin-roles') || 
            user?.permissions?.includes('ROLE_SUPER_ADMIN')) && (
            <>
              <div className="nav-separator" />
              <div className="nav-group-title">{!collapsed ? t('layout.system') : '⋯'}</div>
              <NavLink to="/admin/users" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`} id="nav-admin-users">
                <span className="nav-item__icon">👥</span>
                <span className="nav-item__label">{t('layout.usersPermissions')}</span>
              </NavLink>
            </>
          )}

          {/* Upgrade Button for non-premium users */}
          {(!user?.permissions?.includes('ROLE_SUPER_ADMIN') && !user?.permissions?.includes('nav-analytics')) && (
            <>
              <div className="nav-separator" />
              <NavLink to="/pricing" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''} nav-upgrade-btn`} id="nav-pricing">
                <span className="nav-item__icon">🚀</span>
                <span className="nav-item__label" style={{ color: '#d4af37', fontWeight: 'bold' }}>{t('layout.upgradePremium')}</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__actions-row">
            <button className={`action-btn ${isBlindMode ? 'action-btn--active' : ''}`} onClick={toggleBlindMode} title={isBlindMode ? t('layout.blindModeOn') || 'Blind Mode On' : t('layout.blindModeOff') || 'Blind Mode Off'}>
              {isBlindMode ? '🙈' : '👁️'}
            </button>
            <button className="action-btn" onClick={toggleTheme} title={theme === 'dark' ? t('layout.themeLight') || 'Light Theme' : t('layout.themeDark') || 'Dark Theme'}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div className="action-select-wrapper" title="Language">
              <span className="action-select-icon">🌐</span>
              <select value={i18n.language} onChange={(e) => changeLanguage(e.target.value)} className="action-select">
                <option value="vi">VI</option>
                <option value="en">EN</option>
              </select>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
