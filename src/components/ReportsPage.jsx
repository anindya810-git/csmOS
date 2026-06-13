import React, { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useFeatures } from '../hooks/useFeatures';

export default function ReportsPage() {
  const { isEnabled } = useFeatures();
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
        <p className="text-sm text-gray-500 mt-0.5">Renewals, escalation summaries, issue analysis, and task reports</p>
      </div>
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        <NavLink to="rag"              className={tabClass}>RAG Status</NavLink>
        <NavLink to="renewals"         className={tabClass}>Renewals</NavLink>
        <NavLink to="weekly"           className={tabClass}>Weekly View</NavLink>
        <NavLink to="issues-pivot"     className={tabClass}>Issue Breakdown</NavLink>
        <NavLink to="account-mapping"  className={tabClass}>Account Mapping</NavLink>
        <NavLink to="task-pivot"       className={tabClass}>Task Analysis</NavLink>
        <NavLink to="feature-requests" className={tabClass}>Feature Requests</NavLink>
        {isEnabled('custom_reports') && <NavLink to="custom" className={tabClass}>Custom Reports</NavLink>}
      </div>
      {/* Keep the tab bar mounted while a lazily-loaded report chunk arrives */}
      <Suspense fallback={
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <Outlet />
      </Suspense>
    </div>
  );
}
