import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/superadminAxios';
import { FEATURE_DEFS } from '../../hooks/useFeatures';
import CloneOrgModal from './CloneOrgModal';
import OrgLoginReport from './OrgLoginReport';

const PLAN_OPTIONS   = ['trial', 'starter', 'pro', 'enterprise'];
const STATUS_OPTIONS = ['active', 'suspended', 'cancelled'];
const PLAN_COLORS    = { trial: 'bg-gray-700 text-gray-300', starter: 'bg-blue-900 text-blue-300', pro: 'bg-violet-900 text-violet-300', enterprise: 'bg-amber-900 text-amber-300' };
const STATUS_COLORS  = { active: 'bg-emerald-900 text-emerald-300', suspended: 'bg-amber-900 text-amber-300', cancelled: 'bg-red-900 text-red-300' };

export default function OrgDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [org, setOrg]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateLink, setImpersonateLink] = useState('');
  const [error, setError]   = useState('');
  const [featForm, setFeatForm] = useState({});
  const [featSaving, setFeatSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [domain, setDomain] = useState('');
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainError, setDomainError] = useState('');
  const [domainSaved, setDomainSaved] = useState(false);
  const [themeColor, setThemeColor] = useState('');
  const [themeHex, setThemeHex] = useState('');
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);
  const [showClone, setShowClone] = useState(false);
  const [showLoginReport, setShowLoginReport] = useState(false);

  useEffect(() => { fetchOrg(); }, [id]);

  async function fetchOrg() {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/superadmin?resource=orgs&id=${id}`);
      setOrg(data);
      setForm({ name: data.name, plan: data.plan, billing_status: data.billing_status, user_limit: data.user_limit, notes: data.notes || '' });
      setFeatForm(data.features || {});
      setDomain(data.custom_domain || '');
      setThemeColor(data.theme_color || '');
      setThemeHex(data.theme_color || '');
    } catch { setError('Failed to load organisation'); }
    finally { setLoading(false); }
  }

  // Default-on: a feature is enabled unless explicitly set to false.
  const featOn = (key) => featForm[key] !== false;
  const toggleFeature = (key) => setFeatForm(f => ({ ...f, [key]: f[key] === false }));

  async function saveFeatures() {
    setFeatSaving(true); setError('');
    try {
      const { data } = await api.put(`/api/superadmin?resource=orgs&id=${id}`, { features: featForm });
      setOrg(o => ({ ...o, ...data }));
      setFeatForm(data.features || featForm);
    } catch (err) { setError(err?.response?.data?.error || 'Failed to save features'); }
    finally { setFeatSaving(false); }
  }

  function onLogoFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setLogoError('');
    if (!file.type.startsWith('image/')) { setLogoError('Choose an image file (PNG, JPG or SVG).'); return; }
    if (file.size > 512 * 1024) { setLogoError('Logo must be under 512 KB.'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      setLogoBusy(true);
      try {
        const { data } = await api.post(`/api/superadmin?resource=orgs&id=${id}&action=logo`, { logo_data: reader.result });
        setOrg(o => ({ ...o, ...data }));
      } catch (err) { setLogoError(err?.response?.data?.error || 'Upload failed'); }
      finally { setLogoBusy(false); }
    };
    reader.readAsDataURL(file);
  }

  async function removeLogo() {
    setLogoBusy(true); setLogoError('');
    try {
      const { data } = await api.delete(`/api/superadmin?resource=orgs&id=${id}&action=logo`);
      setOrg(o => ({ ...o, ...data }));
    } catch (err) { setLogoError(err?.response?.data?.error || 'Failed to remove'); }
    finally { setLogoBusy(false); }
  }

  async function saveDomain() {
    setDomainSaving(true); setDomainError(''); setDomainSaved(false);
    try {
      const { data } = await api.put(`/api/superadmin?resource=orgs&id=${id}`, { custom_domain: domain.trim() });
      setOrg(o => ({ ...o, ...data }));
      setDomain(data.custom_domain || '');
      setDomainSaved(true);
      setTimeout(() => setDomainSaved(false), 2500);
    } catch (err) { setDomainError(err?.response?.data?.error || 'Failed to save domain'); }
    finally { setDomainSaving(false); }
  }

  async function saveTheme() {
    const isValid = /^#[0-9a-fA-F]{6}$/.test(themeHex.trim());
    const val = isValid ? themeHex.trim() : null;
    setThemeSaving(true); setThemeSaved(false);
    try {
      const { data } = await api.put(`/api/superadmin?resource=orgs&id=${id}`, { theme_color: val });
      setOrg(o => ({ ...o, ...data }));
      setThemeColor(data.theme_color || '');
      setThemeHex(data.theme_color || '');
      setThemeSaved(true);
      setTimeout(() => setThemeSaved(false), 2500);
    } catch (err) { setError(err?.response?.data?.error || 'Failed to save theme'); }
    finally { setThemeSaving(false); }
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const { data } = await api.put(`/api/superadmin?resource=orgs&id=${id}`, form);
      setOrg(o => ({ ...o, ...data }));
      setEditing(false);
    } catch (err) { setError(err?.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  }

  async function impersonate() {
    setImpersonating(true); setError('');
    try {
      const { data } = await api.post('/api/superadmin?action=impersonate', { org_id: Number(id) });
      const url = `${window.location.origin}/superadmin/enter?token=${encodeURIComponent(data.token)}`;
      setImpersonateLink(url);
    } catch (err) { setError(err?.response?.data?.error || 'Failed to generate link'); }
    finally { setImpersonating(false); }
  }

  async function deleteOrg() {
    if (!confirm(`Delete "${org.name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await api.delete(`/api/superadmin?resource=orgs&id=${id}`);
      navigate('/superadmin/orgs');
    } catch (err) { setError(err?.response?.data?.error || 'Failed to delete'); }
  }

  const inputCls = "bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full";

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!org) return <div className="p-8 text-red-400">{error || 'Not found'}</div>;

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/superadmin/orgs')} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white">{org.name}</h1>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[org.plan]}`}>{org.plan}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[org.billing_status]}`}>{org.billing_status}</span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">{org.slug} · created {org.created_at ? new Date(org.created_at).toLocaleDateString() : '–'}</p>
        </div>
      </div>

      {error && <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}

      {/* Usage stats */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          ['Users', org._stats?.users, org.user_limit ? `/ ${org.user_limit}` : ''],
          ['Accounts', org._stats?.accounts],
          ['Issues', org._stats?.issues],
          ['Escalations', org._stats?.escalations],
          ['Tasks', org._stats?.tasks],
          ['Feature Reqs', org._stats?.feature_requests],
          ['Reports', org._stats?.custom_reports],
        ].map(([label, val, sub]) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">{val ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-gray-600">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Branding / logo */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Branding</h2>
            <p className="text-xs text-gray-500 mt-0.5">This logo replaces the Custally logo in the app header for this org. PNG/JPG/SVG, under 512 KB.</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 flex-wrap">
          <div className="h-14 w-44 rounded-xl bg-white border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
            {org.logo_url
              ? <img src={org.logo_url} alt={`${org.name} logo`} className="max-h-10 max-w-[150px] object-contain" />
              : <span className="text-xs text-gray-400">No logo</span>}
          </div>
          <label className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${logoBusy ? 'bg-gray-700 text-gray-400' : 'bg-brand-600 hover:bg-brand-700 text-white'}`}>
            {logoBusy ? 'Working…' : (org.logo_url ? 'Replace logo' : 'Upload logo')}
            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" disabled={logoBusy} onChange={onLogoFile} />
          </label>
          {org.logo_url && (
            <button onClick={removeLogo} disabled={logoBusy} className="px-4 py-2 rounded-xl text-sm font-medium text-red-300 border border-red-800 bg-red-900/40 hover:bg-red-900 transition disabled:opacity-50">
              Remove
            </button>
          )}
        </div>
        {logoError && <p className="text-xs text-red-400 mt-3">{logoError}</p>}
      </div>

      {/* Custom domain (white-label) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white">Custom Domain (White-label)</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Visitors to this domain skip the Custally landing page and land on a login screen showing this org's logo only — no Custally branding. Leave blank to disable.
        </p>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <input
            value={domain}
            onChange={e => { setDomain(e.target.value); setDomainSaved(false); }}
            placeholder="projectnext.me"
            spellCheck={false}
            autoCapitalize="none"
            className={`${inputCls} flex-1 min-w-[220px] max-w-md`}
          />
          <button
            onClick={saveDomain}
            disabled={domainSaving || (domain.trim() === (org.custom_domain || ''))}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-40"
          >
            {domainSaving ? 'Saving…' : 'Save Domain'}
          </button>
          {domainSaved && <span className="text-xs text-emerald-400 font-medium">Saved ✓</span>}
        </div>
        {domainError && <p className="text-xs text-red-400 mt-3">{domainError}</p>}
        {org.custom_domain && (
          <div className="mt-4 bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1.5">
            <p className="text-xs text-gray-400">
              Active domain: <span className="text-white font-medium">{org.custom_domain}</span>
            </p>
            <p className="text-xs text-gray-500">
              DNS setup: add <span className="text-gray-300 font-medium">{org.custom_domain}</span> as a domain in the Vercel project, then point the client's DNS there
              (apex → A record <span className="text-gray-300 font-mono">76.76.21.21</span>, or a subdomain → CNAME to <span className="text-gray-300 font-mono">cname.vercel-dns.com</span>).
            </p>
          </div>
        )}
      </div>

      {/* Color theme */}
      {(() => {
        const PRESETS = [
          { label: 'Custally Green', hex: '#0ea47e' },
          { label: 'Ocean Blue',     hex: '#0284c7' },
          { label: 'Indigo',         hex: '#4f46e5' },
          { label: 'Violet',         hex: '#7c3aed' },
          { label: 'Rose',           hex: '#e11d48' },
          { label: 'Amber',          hex: '#d97706' },
          { label: 'Teal',           hex: '#0d9488' },
          { label: 'Slate',          hex: '#475569' },
        ];
        const isValid = h => /^#[0-9a-fA-F]{6}$/.test((h || '').trim());
        const unchanged = themeHex.trim() === (org.theme_color || '');
        return (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Color Theme</h2>
              <p className="text-xs text-gray-500 mt-0.5">Brand color used across the org's app. Leave blank to use the default.</p>
            </div>
            {/* Presets */}
            <div className="flex gap-3 flex-wrap">
              {PRESETS.map(p => (
                <button
                  key={p.hex}
                  title={p.label}
                  onClick={() => { setThemeHex(p.hex); setThemeColor(p.hex); }}
                  className="flex flex-col items-center gap-1 focus:outline-none group"
                >
                  <span
                    className={`w-8 h-8 rounded-full border-2 transition-transform group-hover:scale-110 ${themeHex === p.hex ? 'border-white scale-110' : 'border-gray-700'}`}
                    style={{ backgroundColor: p.hex }}
                  />
                  <span className="text-[9px] text-gray-500">{p.label}</span>
                </button>
              ))}
            </div>
            {/* Hex input + picker */}
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={isValid(themeHex) ? themeHex : '#0ea47e'}
                onChange={e => { setThemeHex(e.target.value); setThemeColor(e.target.value); }}
                className="w-10 h-10 p-0.5 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer shrink-0"
              />
              <input
                value={themeHex}
                onChange={e => { setThemeHex(e.target.value); }}
                placeholder="#0ea47e"
                maxLength={7}
                className={`${inputCls} w-36 font-mono`}
              />
              {themeHex && (
                <button onClick={() => { setThemeHex(''); setThemeColor(''); }} className="text-xs text-gray-500 hover:text-gray-300 transition">
                  Clear
                </button>
              )}
            </div>
            {themeHex && !isValid(themeHex) && (
              <p className="text-xs text-red-400">Enter a valid 6-digit hex color (e.g. #4f46e5)</p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={saveTheme}
                disabled={themeSaving || (unchanged && !themeSaved)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold whitespace-nowrap transition disabled:opacity-40"
              >
                {themeSaving ? 'Saving…' : 'Save Theme'}
              </button>
              {themeSaved && <span className="text-xs text-emerald-400 font-medium">Saved ✓</span>}
            </div>
          </div>
        );
      })()}

      {/* Edit form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Organisation Settings</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-xs px-3 py-1.5 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition">Edit</button>
          )}
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Name</label>
            {editing ? <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              : <p className="text-white text-sm">{org.name}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Plan</label>
            {editing ? (
              <select className={inputCls} value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : <p className="text-white text-sm capitalize">{org.plan}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Billing Status</label>
            {editing ? (
              <select className={inputCls} value={form.billing_status} onChange={e => setForm(f => ({ ...f, billing_status: e.target.value }))}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : <p className="text-white text-sm capitalize">{org.billing_status}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">User Seat Limit</label>
            {editing ? <input type="number" className={inputCls} value={form.user_limit} min={1} onChange={e => setForm(f => ({ ...f, user_limit: Number(e.target.value) }))} />
              : <p className="text-white text-sm">{org.user_limit}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1.5">Internal Notes</label>
            {editing ? <textarea className={inputCls} rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes about this client…" />
              : <p className="text-white text-sm whitespace-pre-wrap">{org.notes || <span className="text-gray-600">–</span>}</p>}
          </div>
        </div>
        {editing && (
          <div className="px-5 pb-5 flex gap-3">
            <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-700 text-gray-300 rounded-xl text-sm hover:bg-gray-800 transition">Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Features / Entitlements */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Features &amp; Entitlements</h2>
            <p className="text-xs text-gray-500 mt-0.5">Turn features off for this organisation. Changes apply on the user's next page load.</p>
          </div>
          <button
            onClick={saveFeatures}
            disabled={featSaving || JSON.stringify(featForm) === JSON.stringify(org.features || {})}
            className="text-xs px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold transition disabled:opacity-40"
          >
            {featSaving ? 'Saving…' : 'Save Features'}
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURE_DEFS.map(f => (
            <button
              key={f.key}
              onClick={() => toggleFeature(f.key)}
              className={`flex items-center justify-between gap-3 text-left px-4 py-3 rounded-xl border transition ${featOn(f.key) ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-950 border-gray-800'}`}
            >
              <div className="min-w-0">
                <p className={`text-sm font-medium ${featOn(f.key) ? 'text-white' : 'text-gray-500'}`}>{f.label}</p>
                <p className="text-xs text-gray-500 truncate">{f.desc}</p>
              </div>
              <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${featOn(f.key) ? 'bg-brand-600' : 'bg-gray-700'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${featOn(f.key) ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Users table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Users ({org.users?.length ?? 0})</h2>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {(org.users || []).map(u => (
                <tr key={u.id} className="hover:bg-gray-800/40 transition">
                  <td className="px-5 py-3 text-white font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-brand-900 text-brand-300' : 'bg-gray-800 text-gray-400'}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.last_active_at ? new Date(u.last_active_at).toLocaleString() : 'Never'}</td>
                </tr>
              ))}
              {(org.users || []).length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-600">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={impersonate} disabled={impersonating}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-60"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {impersonating ? 'Generating…' : 'Login as Admin'}
          </button>
          <button
            onClick={() => setShowLoginReport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition border border-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Activity Report
          </button>
          <button
            onClick={() => setShowClone(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition border border-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Clone Organisation
          </button>
          <button
            onClick={deleteOrg}
            className="flex items-center gap-2 px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-300 rounded-xl text-sm font-medium transition border border-red-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Organisation
          </button>
        </div>

        {impersonateLink && (
          <div className="bg-violet-950 border border-violet-800 rounded-xl p-4 space-y-2">
            <p className="text-xs text-violet-300 font-semibold">Impersonation link (valid 2 hours) — open in a separate browser/incognito window:</p>
            <div className="flex gap-2">
              <input readOnly value={impersonateLink} className="flex-1 bg-gray-900 border border-gray-700 text-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none" />
              <button onClick={() => { navigator.clipboard.writeText(impersonateLink); }} className="px-3 py-1.5 bg-violet-700 hover:bg-violet-600 text-white rounded-lg text-xs font-medium transition">Copy</button>
            </div>
          </div>
        )}
      </div>

      {showLoginReport && <OrgLoginReport org={org} onClose={() => setShowLoginReport(false)} />}

      {showClone && (
        <CloneOrgModal
          org={org}
          onClose={() => setShowClone(false)}
          onCloned={(newOrg) => {
            // The modal's "View New Org" button handles navigation; nothing extra needed here.
          }}
        />
      )}
    </div>
  );
}
