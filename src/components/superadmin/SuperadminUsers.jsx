import React, { useState, useEffect } from 'react';
import api from '../../utils/superadminAxios';
import { useSuperadminAuth } from '../../context/SuperadminAuthContext';

const inputCls = "w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-gray-600";
const labelCls = "block text-xs font-medium text-gray-400 mb-1.5";

function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Create / Edit modal ─────────────────────────────────────── */
function AdminFormModal({ editing, onClose, onSaved }) {
  const isEdit = !!editing;
  const [form, setForm] = useState({ name: editing?.name || '', email: editing?.email || '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || (!isEdit && !form.password)) {
      setError('Name, email and password are required'); return;
    }
    setLoading(true); setError('');
    try {
      if (isEdit) {
        const payload = { name: form.name, email: form.email };
        if (form.password) payload.password = form.password;
        await api.put(`/api/superadmin?resource=admins&id=${editing.id}`, payload);
      } else {
        await api.post('/api/superadmin?resource=admins', form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save administrator');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">{isEdit ? 'Edit Administrator' : 'New Administrator'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@custally.com" />
          </div>
          <div>
            <label className={labelCls}>{isEdit ? 'New Password' : 'Password *'}</label>
            <input type="password" className={inputCls} value={form.password} onChange={e => set('password', e.target.value)}
              placeholder={isEdit ? 'Leave blank to keep current' : 'Min. 8 characters'} minLength={isEdit ? undefined : 8} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-700 text-gray-300 rounded-xl text-sm hover:bg-gray-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Administrator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Replace modal ───────────────────────────────────────────── */
function ReplaceModal({ target, admins, currentId, onClose, onReplaced }) {
  const [withId, setWithId] = useState('');
  const [deactivate, setDeactivate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Successors: every other admin that is currently active.
  const options = admins.filter(a => String(a.id) !== String(target.id) && a.is_active !== false);

  async function submit() {
    if (!withId) return;
    setLoading(true); setError('');
    try {
      await api.post('/api/superadmin?resource=admins&action=replace', {
        old_admin_id: target.id,
        new_admin_id: withId,
        deactivate_old: deactivate,
      });
      onReplaced();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to replace');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Replace administrator</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Superadmins share full platform access and own no organisation data, so there is nothing to
            reassign — replacing simply hands over to the successor and deactivates <b className="text-gray-300">{target.name}</b>.
          </p>
          <div>
            <label className={labelCls}>Successor</label>
            <select className={inputCls} value={withId} onChange={e => setWithId(e.target.value)}>
              <option value="">— Select a superadmin —</option>
              {options.map(a => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
            </select>
            {options.length === 0 && (
              <p className="text-xs text-amber-400 mt-1.5">No other active superadmin available. Create one first.</p>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={deactivate} onChange={e => setDeactivate(e.target.checked)}
              disabled={String(target.id) === String(currentId)} className="!w-4 !h-4 accent-brand-600" />
            <span className="text-sm text-gray-300">Deactivate <b>{target.name}</b> after handover</span>
          </label>
          {String(target.id) === String(currentId) && (
            <p className="text-xs text-amber-400">You can't deactivate your own account.</p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-700 text-gray-300 rounded-xl text-sm hover:bg-gray-800 transition">Cancel</button>
            <button onClick={submit} disabled={!withId || loading} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
              {loading ? 'Replacing…' : 'Replace'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function SuperadminUsers() {
  const { admin: currentAdmin } = useSuperadminAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { fetchAdmins(); }, []);

  async function fetchAdmins() {
    setLoading(true);
    try { const { data } = await api.get('/api/superadmin?resource=admins'); setAdmins(data || []); setError(''); }
    catch (err) { setError(err?.response?.data?.error || 'Failed to load administrators'); }
    finally { setLoading(false); }
  }

  async function toggleActive(a) {
    const active = a.is_active !== false;
    setBusyId(a.id);
    try {
      await api.put(`/api/superadmin?resource=admins&id=${a.id}`, { is_active: !active });
      fetchAdmins();
    } catch (err) { alert(err?.response?.data?.error || 'Failed'); }
    finally { setBusyId(null); }
  }

  async function remove(a) {
    if (!window.confirm(`Delete superadmin "${a.name}"? This cannot be undone.`)) return;
    setBusyId(a.id);
    try { await api.delete(`/api/superadmin?resource=admins&id=${a.id}`); fetchAdmins(); }
    catch (err) { alert(err?.response?.data?.error || 'Failed'); }
    finally { setBusyId(null); }
  }

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (a) => { setEditing(a); setShowForm(true); };

  const iconBtn = "p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Administrators</h1>
          <p className="text-gray-500 text-sm mt-0.5">{admins.length} superadmin{admins.length !== 1 ? 's' : ''} · full platform access</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Administrator
        </button>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-xl px-4 py-3">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last login</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {admins.map(a => {
                const active = a.is_active !== false;
                const isSelf = String(a.id) === String(currentAdmin?.id);
                const busy = busyId === a.id;
                return (
                  <tr key={a.id} className="hover:bg-gray-800/60 transition">
                    <td className="px-5 py-4">
                      <span className="font-medium text-white">{a.name}</span>
                      {isSelf && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide bg-brand-900 text-brand-300 px-1.5 py-0.5 rounded">You</span>}
                    </td>
                    <td className="px-4 py-4 text-gray-400">{a.email}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${active ? 'bg-emerald-900 text-emerald-300' : 'bg-gray-700 text-gray-400'}`}>
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-xs">{fmtDate(a.last_login_at)}</td>
                    <td className="px-4 py-4 text-gray-500 text-xs">{fmtDate(a.created_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(a)} disabled={busy} className={iconBtn} title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => toggleActive(a)} disabled={busy || isSelf}
                          className={`${iconBtn} ${active ? 'hover:!text-amber-400' : 'hover:!text-emerald-400'}`}
                          title={isSelf ? "You can't deactivate yourself" : active ? 'Deactivate' : 'Activate'}>
                          {active ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <button onClick={() => setReplaceTarget(a)} disabled={busy || isSelf}
                          className={`${iconBtn} hover:!text-violet-400`}
                          title={isSelf ? "You can't replace yourself" : 'Replace (hand over & deactivate)'}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m4 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </button>
                        <button onClick={() => remove(a)} disabled={busy || isSelf}
                          className={`${iconBtn} hover:!text-red-400`}
                          title={isSelf ? "You can't delete yourself" : 'Delete'}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {admins.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-600">No administrators found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <AdminFormModal editing={editing} onClose={() => setShowForm(false)} onSaved={fetchAdmins} />}
      {replaceTarget && (
        <ReplaceModal
          target={replaceTarget}
          admins={admins}
          currentId={currentAdmin?.id}
          onClose={() => setReplaceTarget(null)}
          onReplaced={fetchAdmins}
        />
      )}
    </div>
  );
}
