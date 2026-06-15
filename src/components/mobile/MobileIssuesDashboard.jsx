import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const STATUSES = ['All', 'Open', 'Escalated', 'Resolved', 'Closed'];

const PRIORITY_STYLES = {
  P0: 'bg-red-100 text-red-700',
  P1: 'bg-orange-100 text-orange-700',
  P2: 'bg-amber-100 text-amber-700',
  P3: 'bg-gray-100 text-gray-600',
};

const STATUS_STYLES = {
  Open: 'bg-blue-100 text-blue-700',
  Escalated: 'bg-red-100 text-red-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-600',
};

const INPUT_CLASS =
  'bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MobileIssuesDashboard() {
  useAuth();
  const [issues, setIssues] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    account_id: '',
    account_name: '',
    description: '',
    priority: 'P1',
    status: 'Open',
    issue_type: '',
    owner_team: '',
  });

  useEffect(() => {
    Promise.all([axios.get('/api/issues'), axios.get('/api/accounts')])
      .then(([issRes, accRes]) => {
        setIssues(issRes.data);
        setAccounts(accRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return issues.filter((issue) => {
      const matchStatus = activeStatus === 'All' || issue.status === activeStatus;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (issue.description || '').toLowerCase().includes(q) ||
        (issue.account_name || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [issues, activeStatus, search]);

  function handleAccountChange(e) {
    const id = e.target.value;
    const acc = accounts.find((a) => String(a.id) === String(id));
    setForm((f) => ({ ...f, account_id: id, account_name: acc ? acc.name : '' }));
  }

  function handleField(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.account_id || !form.description) return;
    setSubmitting(true);
    try {
      const res = await axios.post('/api/issues', {
        account_id: form.account_id,
        account_name: form.account_name,
        description: form.description,
        priority: form.priority,
        status: form.status,
        issue_type: form.issue_type,
        owner_team: form.owner_team,
      });
      setIssues((prev) => [res.data, ...prev]);
      setSheetOpen(false);
      setForm({
        account_id: '',
        account_name: '',
        description: '',
        priority: 'P1',
        status: 'Open',
        issue_type: '',
        owner_team: '',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-bold text-gray-900">Issues</h1>
        <p className="text-sm text-gray-500 mt-0.5">{filtered.length} issue{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="overflow-x-auto px-4 mb-3">
        <div className="flex gap-2 w-max">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setActiveStatus(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[44px] transition-colors ${
                activeStatus === s
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mb-4">
        <input
          type="search"
          placeholder="Search issues..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">No issues found</div>
      ) : (
        <div className="px-4 flex flex-col gap-3">
          {filtered.map((issue) => (
            <div key={issue.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500 font-medium">{issue.account_name}</span>
                <span className="text-xs text-gray-400">{formatDate(issue.reported_date)}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                {issue.description}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    PRIORITY_STYLES[issue.priority] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {issue.priority}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    STATUS_STYLES[issue.status] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {issue.status}
                </span>
                {issue.issue_type && (
                  <span className="text-xs text-gray-500 truncate">{issue.issue_type}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-20 right-4 bg-brand-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-3xl leading-none"
        aria-label="Add Issue"
      >
        +
      </button>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="bg-white rounded-t-3xl px-4 pt-5 pb-10 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Add Issue</h2>
              <button
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Account *</label>
                <select
                  className={INPUT_CLASS}
                  value={form.account_id}
                  onChange={handleAccountChange}
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                <textarea
                  name="description"
                  rows={4}
                  className={INPUT_CLASS}
                  value={form.description}
                  onChange={handleField}
                  required
                  placeholder="Describe the issue..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                <select name="priority" className={INPUT_CLASS} value={form.priority} onChange={handleField}>
                  <option value="P0">P0 — Critical</option>
                  <option value="P1">P1 — High</option>
                  <option value="P2">P2 — Medium</option>
                  <option value="P3">P3 — Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select name="status" className={INPUT_CLASS} value={form.status} onChange={handleField}>
                  <option value="Open">Open</option>
                  <option value="Escalated">Escalated</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Issue Type</label>
                <input
                  name="issue_type"
                  type="text"
                  className={INPUT_CLASS}
                  value={form.issue_type}
                  onChange={handleField}
                  placeholder="e.g. Bug, Feature Request"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Owner Team</label>
                <input
                  name="owner_team"
                  type="text"
                  className={INPUT_CLASS}
                  value={form.owner_team}
                  onChange={handleField}
                  placeholder="e.g. Engineering"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full bg-brand-600 text-white font-semibold rounded-xl py-3 min-h-[44px] disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Add Issue'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
