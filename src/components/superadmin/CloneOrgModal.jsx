import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/superadminAxios';

const autoSlug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

export default function CloneOrgModal({ org, onClose, onCloned }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    new_name: `Copy of ${org.name}`,
    new_slug: `${org.slug}-copy`,
    clone_users: false,
    clone_dropdown: true,
    clone_accounts: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [result, setResult]   = useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function handleNameChange(name) {
    setForm(f => ({ ...f, new_name: name, new_slug: autoSlug(name) }));
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/api/superadmin?resource=clone', {
        source_org_id: org.id,
        new_name: form.new_name,
        new_slug: form.new_slug || autoSlug(form.new_name),
        clone_users: form.clone_users,
        clone_dropdown: form.clone_dropdown,
        clone_accounts: form.clone_accounts,
      });
      setResult(data);
      onCloned?.(data.org);
    } catch (err) {
      setError(err?.response?.data?.error || 'Clone failed');
    } finally { setLoading(false); }
  }

  const inputCls = "w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-gray-600";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1.5";

  if (result) {
    const entries = Object.entries(result.cloned);
    const LABELS = { users: 'Users', dropdowns: 'Dropdown configs', accounts: 'Accounts', issues: 'Issues', escalations: 'Escalations', tasks: 'Tasks', feature_requests: 'Feature requests' };
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
          <div className="px-6 py-6 text-center">
            <div className="w-12 h-12 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-white font-semibold text-lg mb-1">Clone Complete</h2>
            <p className="text-gray-400 text-sm mb-5">
              <span className="text-white font-medium">{result.org.name}</span> has been created.
            </p>

            <div className="bg-gray-800 rounded-xl p-4 text-left mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Settings &amp; features — always cloned</p>
              {entries.length > 0 ? (
                <div className="space-y-2 pt-2 border-t border-gray-700 mt-2">
                  {entries.map(([key, count]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{LABELS[key] || key}</span>
                      <span className="text-white font-medium tabular-nums">{count} cloned</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-xs pt-2 border-t border-gray-700 mt-2">No data cloned (settings only)</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { onClose(); navigate(`/superadmin/orgs/${result.org.id}`); }}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition"
              >
                View New Org
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-700 text-gray-300 rounded-xl text-sm hover:bg-gray-800 transition">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const OPTIONS = [
    { key: 'clone_dropdown', label: 'Dropdown Config',   desc: 'Custom dropdown values and field configs' },
    { key: 'clone_users',    label: 'Users',              desc: 'All users copied with same credentials and roles' },
    { key: 'clone_accounts', label: 'Accounts & Data',   desc: 'Accounts, issues, escalations, tasks, feature requests' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Clone Organisation</h2>
            <p className="text-gray-500 text-xs mt-0.5">Copying from <span className="text-gray-300">{org.name}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {/* New org identity */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Organisation</p>
            <div>
              <label className={labelCls}>Name *</label>
              <input className={inputCls} value={form.new_name} onChange={e => handleNameChange(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <input className={inputCls} value={form.new_slug} onChange={e => set('new_slug', e.target.value)} />
            </div>
          </div>

          {/* What to clone */}
          <div className="space-y-2 pt-1 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">What to Clone</p>

            {/* Always-on row */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-800/50">
              <div className="w-4 h-4 rounded bg-brand-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-white">Settings &amp; Feature Flags</p>
                <p className="text-xs text-gray-500">Plan, seat limit, feature entitlements</p>
              </div>
              <span className="text-xs text-gray-600 font-medium">Always</span>
            </div>

            {OPTIONS.map(({ key, label, desc }) => (
              <label key={key} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-800/50 cursor-pointer hover:bg-gray-800 transition">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={e => set(key, e.target.checked)}
                  className="!w-4 !h-4 !p-0 !border-0 !ring-0 shrink-0 accent-brand-600"
                />
                <div className="flex-1">
                  <p className="text-sm text-white">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </label>
            ))}

            {form.clone_users && (
              <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-900/40 rounded-lg px-3 py-2 mt-1">
                Users share email credentials with the source org — they can log in to either org.
              </p>
            )}
            {form.clone_accounts && (
              <p className="text-xs text-blue-400 bg-blue-900/20 border border-blue-900/40 rounded-lg px-3 py-2 mt-1">
                Large orgs may take several seconds to clone. Keep this window open until complete.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-700 text-gray-300 rounded-xl text-sm hover:bg-gray-800 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cloning…
                </>
              ) : 'Clone Organisation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
