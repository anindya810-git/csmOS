import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const icon = (d) => (
  <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

const NAV_ITEMS = [
  { to: '/',            end: true,  label: 'Dashboard',   d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/accounts',   end: false, label: 'Accounts',    d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { to: '/renewal',    end: false, label: 'Renewals',    d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to: '/rag',        end: false, label: 'RAG',         d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { to: '/escalations',end: false, label: 'Escalations', d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const topNavClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'}`;

  const tabNavClass = ({ isActive }) =>
    `flex-1 flex flex-col items-center justify-center gap-1 py-2 min-w-0 transition ${isActive ? 'text-brand-700' : 'text-gray-400'}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <span className="font-bold text-brand-700 text-lg tracking-tight">csmOS</span>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <NavLink key={item.to} to={item.to} end={item.end} className={topNavClass}>
                  {icon(item.d)}
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-sm text-gray-600 flex items-center gap-2">
              <span className="font-medium max-w-[120px] sm:max-w-none truncate">{user?.name}</span>
              {user?.role === 'admin' && <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">Admin</span>}
            </span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 transition font-medium px-2 py-1 rounded shrink-0">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-6 pb-24 sm:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar — primary navigation on phones */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex pb-safe shadow-[0_-1px_3px_rgba(0,0,0,0.04)]">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} className={tabNavClass}>
            {icon(item.d)}
            <span className="text-[10px] font-medium leading-none truncate max-w-full px-0.5">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
