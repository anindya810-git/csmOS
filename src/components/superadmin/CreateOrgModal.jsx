import React, { useState } from 'react';
import api from '../../utils/superadminAxios';

export default function CreateOrgModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', slug: '', plan: 'trial', user_limit: 10,
    admin_name: '', admin_email: '', admin_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  function autoSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  }

  function set(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === 'name' && f.slug === autoSlug(f.name)) next.slug = autoSlug(v);
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/api/superadmin?resource=orgs', {
        ...form,
        slug: form.slug || autoSlug(form.name),
      });
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create organisation');
    } finally { setLoading(false); }
  }

  const inputCls = "w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-gray-600";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">New Organisation</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Organisation</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Name *</label>
                <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Corp" required />
              </div>
              <div>
                <label className={labelCls}>Slug</label>
                <input className={inputCls} value={form.slug || autoSlug(form.name)} onChange={e => set('slug', e.target.value)} placeholder="acme-corp" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Plan</label>
                <select className={inputCls} value={form.plan} onChange={e => set('plan', e.target.value)}>
                  {['trial','starter','pro','enterprise'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>User Limit</label>
                <input type="number" className={inputCls} value={form.user_limit} onChange={e => set('user_limit', Number(e.target.value))} min={1} />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">First Admin User</p>
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={form.admin_name} onChange={e => set('admin_name', e.target.value)} placeholder="Jane Smith" />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" className={inputCls} value={form.admin_email} onChange={e => set('admin_email', e.target.value)} placeholder="jane@acmecorp.com" required />
            </div>
            <div>
              <label className={labelCls}>Password *</label>
              <input type="password" className={inputCls} value={form.admin_password} onChange={e => set('admin_password', e.target.value)} placeholder="Min. 8 characters" required minLength={8} />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-700 text-gray-300 rounded-xl text-sm hover:bg-gray-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60">
              {loading ? 'Creating…' : 'Create Organisation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
