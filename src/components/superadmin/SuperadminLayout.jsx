import React, { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSuperadminAuth } from '../../context/SuperadminAuthContext';

export default function SuperadminLayout() {
  const { admin, logout } = useSuperadminAuth();
  const navigate = useNavigate();

  function handleLogout() { logout(); navigate('/superadmin/login'); }

  const navItem = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
    }`;

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 64 64" className="w-8 h-8 flex-shrink-0">
              <defs>
                <linearGradient id="sa-logo-g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#0EA47E" />
                  <stop offset="1" stopColor="#2DD4A7" />
                </linearGradient>
              </defs>
              <path d="M47 20 A18 18 0 1 0 47 44" fill="none" stroke="url(#sa-logo-g)" strokeWidth="10" strokeLinecap="round" />
              <polygon points="49,24.5 51.55,29.45 56.5,32 51.55,34.55 49,39.5 46.45,34.55 41.5,32 46.45,29.45" fill="#2DD4A7" />
            </svg>
            <div>
              <p className="text-white text-sm font-bold leading-tight">Cust<span className="text-brand-400">ally</span></p>
              <p className="text-gray-500 text-xs font-medium">Superadmin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink to="/superadmin" end className={navItem}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </NavLink>
          <NavLink to="/superadmin/orgs" className={navItem}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Organisations
          </NavLink>
        </nav>

        <div className="px-3 py-4 border-t border-gray-800">
          <div className="px-2 mb-2">
            <p className="text-xs text-gray-400 truncate">{admin?.name}</p>
            <p className="text-xs text-gray-600 truncate">{admin?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content — Suspense keeps the sidebar mounted while a lazily-loaded
          superadmin page chunk arrives (without it, navigating shows a blank
          page until a manual refresh). */}
      <main className="flex-1 min-w-0 overflow-auto">
        <Suspense fallback={
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
