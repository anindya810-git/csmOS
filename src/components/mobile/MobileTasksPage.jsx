import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const INPUT_CLASS =
  'bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function deriveStatus(task, today) {
  if (task.derived_status) return task.derived_status;
  if (!task.due_date) return 'Open';
  if (task.due_date < today) return 'Overdue';
  return 'Open';
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_STYLES = {
  Overdue: 'bg-red-100 text-red-700',
  Open: 'bg-blue-100 text-blue-700',
  Today: 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
};

const FILTER_TABS = ['All', 'Overdue', 'Today', 'Open', 'Completed'];

export default function MobileTasksPage() {
  useAuth();
  const [tasks, setTasks] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = todayISO();

  const [form, setForm] = useState({
    task_subject: '',
    account_id: '',
    account_name: '',
    due_date: '',
    assigned_to: '',
    nature_of_task: '',
  });

  useEffect(() => {
    Promise.all([axios.get('/api/tasks'), axios.get('/api/accounts')])
      .then(([taskRes, accRes]) => {
        setTasks(taskRes.data);
        setAccounts(accRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const enriched = useMemo(() => {
    return tasks.map((t) => {
      const status = deriveStatus(t, today);
      const displayStatus = status === 'Open' && t.due_date === today ? 'Today' : status;
      return { ...t, _status: displayStatus };
    });
  }, [tasks, today]);

  const filtered = useMemo(() => {
    return enriched.filter((t) => {
      let matchFilter = true;
      if (activeFilter === 'Overdue') matchFilter = t._status === 'Overdue';
      else if (activeFilter === 'Today') matchFilter = t._status === 'Today';
      else if (activeFilter === 'Open') matchFilter = t._status === 'Open';
      else if (activeFilter === 'Completed') matchFilter = t._status === 'Completed';

      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (t.task_subject || '').toLowerCase().includes(q) ||
        (t.account_name || '').toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });
  }, [enriched, activeFilter, search]);

  function dueDateColor(dateStr, status) {
    if (status === 'Overdue') return 'text-red-600';
    if (status === 'Today') return 'text-amber-600';
    return 'text-gray-400';
  }

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
    if (!form.task_subject) return;
    setSubmitting(true);
    try {
      const res = await axios.post('/api/tasks', {
        task_subject: form.task_subject,
        account_id: form.account_id,
        account_name: form.account_name,
        due_date: form.due_date,
        assigned_to: form.assigned_to,
        nature_of_task: form.nature_of_task,
      });
      setTasks((prev) => [res.data, ...prev]);
      setSheetOpen(false);
      setForm({
        task_subject: '',
        account_id: '',
        account_name: '',
        due_date: '',
        assigned_to: '',
        nature_of_task: '',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {filtered.length} task{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="overflow-x-auto px-4 mb-3">
        <div className="flex gap-2 w-max">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[44px] transition-colors ${
                activeFilter === tab
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mb-4">
        <input
          type="search"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">No tasks found</div>
      ) : (
        <div className="px-4 flex flex-col gap-3">
          {filtered.map((task) => (
            <div key={task.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900 leading-snug flex-1">
                  {task.task_subject}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${
                    STATUS_STYLES[task._status] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {task._status}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {task.account_name && (
                  <span className="text-xs text-gray-500">{task.account_name}</span>
                )}
                {task.nature_of_task && (
                  <span className="text-xs text-gray-400">{task.nature_of_task}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${dueDateColor(task.due_date, task._status)}`}
                >
                  {task.due_date ? formatDisplayDate(task.due_date) : 'No due date'}
                </span>
                {task.assigned_to && (
                  <span className="text-xs text-gray-500 ml-auto">{task.assigned_to}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-20 right-4 bg-brand-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-3xl leading-none"
        aria-label="Add Task"
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
              <h2 className="text-lg font-bold text-gray-900">Add Task</h2>
              <button
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Task Subject *</label>
                <input
                  name="task_subject"
                  type="text"
                  className={INPUT_CLASS}
                  value={form.task_subject}
                  onChange={handleField}
                  required
                  placeholder="What needs to be done?"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
                <select className={INPUT_CLASS} value={form.account_id} onChange={handleAccountChange}>
                  <option value="">Select account (optional)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                <input
                  name="due_date"
                  type="date"
                  className={INPUT_CLASS}
                  value={form.due_date}
                  onChange={handleField}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To</label>
                <input
                  name="assigned_to"
                  type="text"
                  className={INPUT_CLASS}
                  value={form.assigned_to}
                  onChange={handleField}
                  placeholder="Name or email"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nature of Task</label>
                <input
                  name="nature_of_task"
                  type="text"
                  className={INPUT_CLASS}
                  value={form.nature_of_task}
                  onChange={handleField}
                  placeholder="e.g. Follow-up, Demo, QBR"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full bg-brand-600 text-white font-semibold rounded-xl py-3 min-h-[44px] disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Add Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
