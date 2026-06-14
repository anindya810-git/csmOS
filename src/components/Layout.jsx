import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFeatures } from '../hooks/useFeatures';
import AssistantWidget from './AssistantWidget';

const icon = (d) => (
  <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

const NAV_ITEMS = [
  { to: '/dashboard',   end: true,  label: 'Dashboard',   d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/accounts',   end: false, label: 'Accounts',    d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { to: '/escalations',end: false, label: 'Escalations', d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { to: '/issues',      end: false, label: 'Issues',      d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { to: '/tasks',       end: false, label: 'Tasks',       d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { to: '/reports',          end: false, label: 'Reports',     d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { to: '/feature-requests', end: false, label: 'Feature Requests', short: 'Features', d: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18' },
];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { isEnabled } = useFeatures();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };

  // Dynamic favicon + browser title when org has a logo/name
  useEffect(() => {
    document.title = user?.org_name || 'Custally';
    if (user?.org_logo_url) {
      // Remove any existing icon links, then add a fresh one with the org logo
      document.querySelectorAll("link[rel~='icon']").forEach(el => el.remove());
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.href = user.org_logo_url;
      document.head.appendChild(link);
    }
    return () => {
      document.title = 'Custally';
    };
  }, [user?.org_logo_url, user?.org_name]);

  // Filter nav items based on feature flags
  const navItems = NAV_ITEMS.filter(item => !item.feature || isEnabled(item.feature));

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const topNavClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'}`;

  const tabNavClass = ({ isActive }) =>
    `flex-1 flex flex-col items-center justify-center gap-1 py-2 min-w-0 transition ${isActive ? 'text-brand-700' : 'text-gray-400'}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="sticky top-0 z-40">
      {/* Support access (impersonation) indicator — only on support sessions */}
      {user?.support_access && (
        <div className="bg-amber-500 text-amber-950 flex items-center justify-center gap-2 px-4 py-1.5 text-xs sm:text-sm font-semibold">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="truncate">Support Access — viewing {user?.org_name || 'this organisation'} as admin. Changes are live.</span>
          <button onClick={handleLogout} className="ml-1 shrink-0 px-2 py-0.5 rounded-md bg-amber-950/15 hover:bg-amber-950/25 transition">Exit</button>
        </div>
      )}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <a href="/accounts" className="flex items-center gap-2 text-decoration-none no-underline">
              {user?.org_logo_url ? (
                <img src={user.org_logo_url} alt={user.org_name || 'Logo'} className="h-8 w-auto max-w-[180px] object-contain" />
              ) : user?.org_name ? (
                <span className="font-bold text-gray-900 text-lg tracking-tight">{user.org_name}</span>
              ) : (
                <>
                  <svg viewBox="0 0 64 64" className="w-7 h-7">
                    <defs>
                      <linearGradient id="nav-logo-g" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#0EA47E" />
                        <stop offset="1" stopColor="#2DD4A7" />
                      </linearGradient>
                    </defs>
                    <path d="M47 20 A18 18 0 1 0 47 44" fill="none" stroke="url(#nav-logo-g)" strokeWidth="10" strokeLinecap="round" />
                    <polygon points="49,24.5 51.55,29.45 56.5,32 51.55,34.55 49,39.5 46.45,34.55 41.5,32 46.45,29.45" fill="#2DD4A7" />
                  </svg>
                  <span className="font-bold text-gray-900 text-lg tracking-tight">Cust<span className="text-brand-600">ally</span></span>
                </>
              )}
            </a>
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map(item => (
                <NavLink key={item.to} to={item.to} end={item.end} className={topNavClass}>
                  {icon(item.d)}
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Avatar + dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-2 rounded-full focus:outline-none group"
              aria-label="User menu"
            >
              <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold select-none group-hover:bg-brand-700 transition">
                {getInitials(user?.name)}
              </div>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  <span className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${user?.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'}`}>
                    {user?.role === 'admin' ? 'Admin' : 'CSM'}
                  </span>
                </div>

                {/* Admin: settings */}
                {user?.role === 'admin' && (
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                )}

                <div className="border-t border-gray-100" />

                {/* Sign out */}
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      </div>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-6 pb-24 sm:pb-6">
        <Suspense fallback={
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <Outlet />
        </Suspense>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex pb-safe shadow-[0_-1px_3px_rgba(0,0,0,0.04)]">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} className={tabNavClass}>
            {icon(item.d)}
            <span className="text-[10px] font-medium leading-none truncate max-w-full px-0.5">{item.short || item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Conversational AI assistant — floating, all authenticated pages */}
      <AssistantWidget />
    </div>
  );
}
