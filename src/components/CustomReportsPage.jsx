import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const VIZ_ICONS = {
  table: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18M10 4v16M3 4h18a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z" />
    </svg>
  ),
  bar: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  line: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" />
    </svg>
  ),
  kpi: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
};

const ENTITY_COLORS = {
  accounts: 'bg-blue-100 text-blue-700',
  issues: 'bg-red-100 text-red-700',
  escalations: 'bg-amber-100 text-amber-700',
  tasks: 'bg-green-100 text-green-700',
};
const ENTITY_LABELS = { accounts: 'Accounts', issues: 'Issues', escalations: 'Escalations', tasks: 'Tasks' };
const VIZ_LABELS = { table: 'Table', bar: 'Bar Chart', line: 'Line Chart', kpi: 'KPI Cards' };

export default function CustomReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/dropdown-config?resource=custom_reports');
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteReport(id) {
    if (!confirm('Delete this report?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/dropdown-config?resource=custom_reports&id=${id}`);
      setReports(r => r.filter(x => x.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Saved tabular reports, charts, and KPI cards built from your data</p>
        </div>
        <button
          onClick={() => navigate('/reports/custom/builder')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Build custom report
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2" />
          </svg>
          <p className="text-gray-500 font-medium">No custom reports yet</p>
          <p className="text-sm text-gray-400 mt-1">Build your first report to get started</p>
          <button
            onClick={() => navigate('/reports/custom/builder')}
            className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
          >
            Build custom report
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(report => {
            const cfg = report.config || {};
            return (
              <div key={report.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                    {VIZ_ICONS[cfg.vizType] || VIZ_ICONS.table}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{report.name}</h3>
                    {report.description && <p className="text-xs text-gray-500 truncate mt-0.5">{report.description}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {cfg.entity && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ENTITY_COLORS[cfg.entity] || 'bg-gray-100 text-gray-600'}`}>
                      {ENTITY_LABELS[cfg.entity] || cfg.entity}
                    </span>
                  )}
                  {cfg.vizType && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {VIZ_LABELS[cfg.vizType] || cfg.vizType}
                    </span>
                  )}
                  {report.is_public && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Shared</span>
                  )}
                </div>

                <div className="text-xs text-gray-400">
                  {report.created_by || '–'} · {report.updated_at
                    ? new Date(report.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '–'}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => navigate(`/reports/custom/builder?id=${report.id}`)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => navigate(`/reports/custom/builder?id=${report.id}&edit=1`)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteReport(report.id)}
                    disabled={deleting === report.id}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                  >
                    {deleting === report.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
