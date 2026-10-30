import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Role-to-badge config
const ROLE_CONFIG = {
  Passenger:          { color: 'var(--role-passenger)', bg: 'rgba(104,211,145,0.15)', icon: '🎫' },
  Admin:              { color: 'var(--role-admin)', bg: 'rgba(246,173,85,0.15)',  icon: '🛡️' },
  'Station Master':   { color: 'var(--role-station)', bg: 'rgba(118,228,247,0.15)', icon: '🏛️' },
  TT:                 { color: 'var(--role-tt)', bg: 'rgba(214,188,250,0.15)', icon: '🎟️' },
  'Loco Pilot':       { color: 'var(--role-loco)', bg: 'rgba(251,182,206,0.15)', icon: '🚂' },
  Guard:              { color: 'var(--role-guard)', bg: 'rgba(251,211,141,0.15)', icon: '🦺' },
  'RPF Officer':      { color: 'var(--role-rpf)', bg: 'rgba(252,129,129,0.15)', icon: '🛡️' },
  'Section Engineer': { color: 'var(--role-engineer)', bg: 'rgba(144,205,244,0.15)', icon: '🔧' },
};

// Page title map
const PAGE_TITLES = {
  '/dashboard':        { title: 'Passenger Dashboard', icon: '🚉' },
  '/admin':            { title: 'Staff Control Panel', icon: '⚙️' },
  '/login':            { title: 'Sign In',             icon: '🔐' },
  '/register':         { title: 'Create Account',      icon: '📝' },
  '/public-complaints':{ title: 'Public Insights',     icon: '🌐' }
};

export default function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [time, setTime]         = useState(new Date());
  const [theme, setTheme]       = useState(localStorage.getItem('theme') || 'dark');

  const token    = localStorage.getItem('token');
  const role     = localStorage.getItem('role') || '';
  const userName = localStorage.getItem('name') || '';

  const roleCfg    = ROLE_CONFIG[role] || {};
  const pageMeta   = PAGE_TITLES[location.pathname] || { title: 'RailPulse', icon: '🚆' };

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Handle theme
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Scroll-shadow effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    ['token','role','name','email'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/login';
  };

  const formatTime = (d) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <>
      {/* Inject keyframe + font once */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .rp-nav-root {
          position: sticky;
          top: 0;
          z-index: 1000;
          font-family: 'Inter', sans-serif;
          background: var(--bg-theme);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-color);
          transition: box-shadow 0.3s ease, background 0.3s ease;
        }
        .rp-nav-root.scrolled {
          box-shadow: 0 4px 32px rgba(0,0,0,0.5);
        }

        /* Glass strip at very top */
        .rp-nav-strip {
          height: 3px;
          background: linear-gradient(90deg, #667eea, #764ba2, #f093fb, #667eea);
          background-size: 300% 100%;
          animation: rp-shimmer 4s linear infinite;
        }
        @keyframes rp-shimmer {
          0%   { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }

        /* Main bar */
        .rp-nav-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          height: 64px;
          gap: 16px;
        }

        /* Logo */
        .rp-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: default;
          user-select: none;
          flex-shrink: 0;
        }
        .rp-logo-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 0 14px rgba(102,126,234,0.5);
          animation: rp-pulse 3s ease-in-out infinite;
        }
        @keyframes rp-pulse {
          0%,100% { box-shadow: 0 0 14px rgba(102,126,234,0.4); }
          50%      { box-shadow: 0 0 26px rgba(102,126,234,0.8); }
        }
        .rp-logo-text {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }
        .rp-logo-name {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          background: linear-gradient(90deg, #a78bfa, #60a5fa, #a78bfa);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: rp-text-shimmer 3s linear infinite;
        }
        @keyframes rp-text-shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        .rp-logo-tagline {
          font-size: 10px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-weight: 500;
        }

        /* Page indicator */
        .rp-page-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
          backdrop-filter: blur(6px);
          flex-shrink: 0;
        }
        .rp-page-indicator span:first-child {
          font-size: 15px;
        }

        /* Spacer */
        .rp-spacer { flex: 1; }

        /* Clock */
        .rp-clock {
          font-size: 12px;
          color: var(--text-muted);
          letter-spacing: 0.5px;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }

        /* Divider */
        .rp-divider {
          width: 1px;
          height: 28px;
          background: var(--border-input);
          flex-shrink: 0;
        }

        /* Role badge */
        .rp-role-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          border: 1px solid currentColor;
          flex-shrink: 0;
          text-transform: uppercase;
          transition: transform 0.2s;
        }
        .rp-role-badge:hover { transform: scale(1.05); }

        /* User chip */
        .rp-user-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .rp-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 10px rgba(102,126,234,0.4);
          flex-shrink: 0;
        }
        .rp-username {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Public gallery btn */
        .rp-public-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(102, 126, 234, 0.15);
          color: var(--color-brand);
          border: 1px solid var(--border-brand);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          text-decoration: none;
        }
        .rp-public-btn:hover {
          background: rgba(102, 126, 234, 0.25);
          border-color: rgba(102, 126, 234, 0.6);
        }

        /* Back / Register complaint btn (shown on public gallery page) */
        .rp-back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(72, 187, 120, 0.15);
          color: #9ae6b4;
          border: 1px solid rgba(72, 187, 120, 0.35);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          text-decoration: none;
        }
        .rp-back-btn:hover {
          background: rgba(72, 187, 120, 0.28);
          border-color: rgba(72, 187, 120, 0.65);
          transform: translateY(-1px);
        }

        /* Logout */
        .rp-logout-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          background: rgba(252, 129, 129, 0.12);
          color: var(--role-rpf);
          border: 1px solid var(--border-danger);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          flex-shrink: 0;
        }
        .rp-logout-btn:hover {
          background: rgba(252,129,129,0.25);
          border-color: rgba(252,129,129,0.6);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(252,129,129,0.2);
        }
        .rp-logout-btn:active { transform: translateY(0); }

        /* Mobile: hide clock */
        @media (max-width: 680px) {
          .rp-clock, .rp-page-indicator, .rp-username { display: none; }
          .rp-nav-bar { padding: 0 16px; }
        }

        /* Theme button */
        .rp-theme-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          font-size: 16px;
        }
        .rp-theme-btn:hover { background: var(--bg-hover); }
      `}</style>

      <nav className={`rp-nav-root${scrolled ? ' scrolled' : ''}`}>
        <div className="rp-nav-strip" />
        <div className="rp-nav-bar">

          {/* Logo */}
          <div className="rp-logo">
            <div className="rp-logo-icon">🚆</div>
            <div className="rp-logo-text">
              <span className="rp-logo-name">RailPulse</span>
              <span className="rp-logo-tagline">Smart Railway System</span>
            </div>
          </div>

          {/* Current page badge */}
          <div className="rp-page-indicator">
            <span>{pageMeta.icon}</span>
            <span>{pageMeta.title}</span>
          </div>

          <div className="rp-spacer" />

          {/* Live clock */}
          <span className="rp-clock">🕐 {formatTime(time)}</span>

          {token && (
            <>
              <div className="rp-divider" />

              {/* Role badge */}
              {role && (
                <div
                  className="rp-role-badge"
                  style={{ color: roleCfg.color, background: roleCfg.bg, borderColor: roleCfg.color + '55' }}
                >
                  <span>{roleCfg.icon}</span>
                  {role}
                </div>
              )}

              <div className="rp-divider" />

              {/* User chip */}
              {userName && (
                <div className="rp-user-chip">
                  <div className="rp-avatar">{userName.charAt(0).toUpperCase()}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                    <span className="rp-username">{userName}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {localStorage.getItem('email') || ''}
                    </span>
                  </div>
                </div>
              )}

              <div className="rp-divider" />

              {location.pathname === '/public-complaints' ? (
                <button className="rp-back-btn" onClick={() => navigate(role === 'Passenger' ? '/dashboard' : '/admin')}>
                  <span>←</span> Back to Dashboard
                </button>
              ) : (
                <button className="rp-public-btn" onClick={() => navigate('/public-complaints')}>
                  <span>🌐</span> Public Gallery
                </button>
              )}

              <div className="rp-divider" />

              <button 
                className="rp-theme-btn" 
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>

              <div className="rp-divider" />

              <button 
                className="rp-logout-btn" 
                onClick={handleLogout}
                title="Log Out"
              >
                <span>🚪</span> Logout
              </button>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
