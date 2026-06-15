import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function fmt(n) {
  if (!n) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}

function KpiCard({ label, value, borderColor }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-4 border-l-4 ${borderColor}`}>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
    </div>
  );
}

export default function MobileDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [issues, setIssues] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/accounts'),
      axios.get('/api/escalations'),
      axios.get('/api/issues'),
      axios.get('/api/tasks'),
    ])
      .then(([acc, esc, iss, tsk]) => {
        setAccounts(acc.data || []);
        setEscalations(esc.data || []);
        setIssues(iss.data || []);
        setTasks(tsk.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const atRiskMrr = accounts
    .filter((a) => a.rag_status === 'Red')
    .reduce((sum, a) => sum + (a.mrr || 0), 0);

  const activeEscalations = escalations.filter(
    (e) => e.status !== 'Resolved' && e.status !== 'Closed'
  ).length;

  const openIssues = issues.filter(
    (i) => i.status !== 'Resolved' && i.status !== 'Closed'
  ).length;

  const today = new Date();
  const openTasks = tasks.filter((t) => {
    if (t.derived_status) return t.derived_status === 'Open';
    return t.due_date && new Date(t.due_date) >= today;
  }).length;

  const redAccounts = accounts
    .filter((a) => a.rag_status === 'Red')
    .slice(0, 5);

  const firstName = user?.name ? user.name.split(' ')[0] : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 pt-8 pb-4 bg-white shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">
          Good {greeting()}{firstName ? `, ${firstName}` : ''}
        </h1>
        {user?.org_name && (
          <p className="text-sm text-gray-500 mt-0.5">{user.org_name}</p>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="px-4 py-5 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="At-Risk MRR"
              value={fmt(atRiskMrr)}
              borderColor="border-red-400"
            />
            <KpiCard
              label="Active Escalations"
              value={activeEscalations}
              borderColor="border-amber-400"
            />
            <KpiCard
              label="Open Issues"
              value={openIssues}
              borderColor="border-blue-400"
            />
            <KpiCard
              label="Open Tasks"
              value={openTasks}
              borderColor="border-green-400"
            />
          </div>

          {redAccounts.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                At-Risk Accounts
              </h2>
              <div className="space-y-2">
                {redAccounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/accounts/${a.id}`)}
                    className="w-full flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3.5 text-left active:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="shrink-0 w-2.5 h-2.5 rounded-full bg-red-500"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-sm">
                          {a.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{fmt(a.mrr)}</p>
                      </div>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-400 shrink-0 ml-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
