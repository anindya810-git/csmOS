import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const STATUSES = ['All', 'Open', 'In Progress', 'Partly Resolved', 'Resolved'];

const STATUS_STYLES = {
  Open: 'bg-red-100 text-red-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  'Partly Resolved': 'bg-blue-100 text-blue-700',
  Resolved: 'bg-green-100 text-green-700',
};

const RAG_COLORS = {
  Red: '#ef4444',
  Amber: '#f59e0b',
  Green: '#22c55e',
};

const INPUT_CLASS =
  'bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function MobileEscalationsDashboard() {
  useAuth();
  const [escalations, setEscalations] = useState([]);
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
    rag_status: 'Amber',
    status: 'Open',
    escalated_by: '',
  });

  useEffect(() => {
    Promise.all([axios.get('/api/escalations'), axios.get('/api/accounts')])
      .then(([escRes, accRes]) => {
        setEscalations(escRes.data);
        setAccounts(accRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return escalations.filter((esc) => {
      const matchStatus = activeStatus === 'All' || esc.status === activeStatus;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (esc.description || '').toLowerCase().includes(q) ||
        (esc.account_name || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [escalations, activeStatus, search]);

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
    if (!form.description) return;
    setSubmitting(true);
    try {
      const res = await axios.post('/api/escalations', {
        account_id: form.account_id,
        account_name: form.account_name,
        description: form.description,
        rag_status: form.rag_status,
        status: form.status,
        escalated_by: form.escalated_by,
        date_of_escalation: todayISO(),
      });
      setEscalations((prev) => [res.data, ...prev]);
      setSheetOpen(false);
      setForm({
        account_id: '',
        account_name: '',
        description: '',
        rag_status: 'Amber',
        status: 'Open',
        escalated_by: '',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-bold text-gray-900">Escalations</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {filtered.length} escalation{filtered.length !== 1 ? 's' : ''}
        </p>
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
          placeholder="Search escalations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">No escalations found</div>
      ) : (
        <div className="px-4 flex flex-col gap-3">
          {filtered.map((esc) => (
            <div key={esc.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: RAG_COLORS[esc.rag_status] || '#d1d5db' }}
                />
                <span className="text-sm font-semibold text-gray-900 flex-1 truncate">
                  {esc.account_name}
                </span>
                <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                  {formatDate(esc.date_of_escalation)}
                </span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2 mb-2">{esc.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    STATUS_STYLES[esc.status] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {esc.status}
                </span>
                {esc.escalated_by && (
                  <span className="text-xs text-gray-500">by {esc.escalated_by}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-20 right-4 bg-brand-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-3xl leading-none"
        aria-label="New Escalation"
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
              <h2 className="text-lg font-bold text-gray-900">New Escalation</h2>
              <button
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
                <select className={INPUT_CLASS} value={form.account_id} onChange={handleAccountChange}>
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
                  rows={3}
                  className={INPUT_CLASS}
                  value={form.description}
                  onChange={handleField}
                  required
                  placeholder="Describe the escalation..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">RAG Status</label>
                <select name="rag_status" className={INPUT_CLASS} value={form.rag_status} onChange={handleField}>
                  <option value="Red">Red</option>
                  <option value="Amber">Amber</option>
                  <option value="Green">Green</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select name="status" className={INPUT_CLASS} value={form.status} onChange={handleField}>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Partly Resolved">Partly Resolved</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Escalated By</label>
                <input
                  name="escalated_by"
                  type="text"
                  className={INPUT_CLASS}
                  value={form.escalated_by}
                  onChange={handleField}
                  placeholder="Name or team"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full bg-brand-600 text-white font-semibold rounded-xl py-3 min-h-[44px] disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Add Escalation'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
