import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import './Layout.css';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(true);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-layout">
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
                {/* Trend line */}
                <path d="M4 24 L10 18 L16 21 L22 10 L28 6" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Arrow tip */}
                <path d="M24 6 L28 6 L28 10" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Pulse dot */}
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

        <nav className="sidebar__nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
            id="nav-calendar"
          >
            <span className="nav-item__icon">📅</span>
            <span className="nav-item__label">Calendar</span>
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
            id="nav-dashboard"
          >
            <span className="nav-item__icon">📈</span>
            <span className="nav-item__label">Dashboard</span>
          </NavLink>
          <NavLink
            to="/rules"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
            id="nav-rules"
          >
            <span className="nav-item__icon">📋</span>
            <span className="nav-item__label">Rules</span>
          </NavLink>
          <NavLink
            to="/gallery"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
            id="nav-gallery"
          >
            <span className="nav-item__icon">🖼️</span>
            <span className="nav-item__label">Gallery</span>
          </NavLink>
        </nav>

        <div className="sidebar__footer">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            id="btn-theme-toggle"
          >
            <span className="theme-toggle__icon">
              {theme === 'dark' ? '☀️' : '🌙'}
            </span>
            <span className="theme-toggle__label">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
