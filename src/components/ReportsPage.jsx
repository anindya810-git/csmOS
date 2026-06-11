import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function ReportsPage() {
  const tabClass = ({ isActive }) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
      isActive
        ? 'border-brand-600 text-brand-700'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Renewals, escalation summaries, and issue analysis</p>
      </div>
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        <NavLink to="renewals"      className={tabClass}>Renewals</NavLink>
        <NavLink to="weekly"        className={tabClass}>Weekly View</NavLink>
        <NavLink to="issues-pivot"  className={tabClass}>Issue Breakdown</NavLink>
      </div>
      <Outlet />
    </div>
  );
}
