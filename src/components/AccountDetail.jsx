import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const RAG_BADGE = { Green: 'bg-green-100 text-green-800', Amber: 'bg-amber-100 text-amber-800', Red: 'bg-red-100 text-red-800' };

function fmt(n) {
  if (n == null || n === '') return '—';
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(2)}L`;
  return `₹${n.toLocaleString()}`;
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-0.5 text-sm ${value ? 'text-gray-900' : 'text-gray-300'}`}>{value || '—'}</p>
    </div>
  );
}

function YNBadge({ value }) {
  if (!value) return <span className="text-gray-300 text-sm">—</span>;
  const yes = value.toLowerCase() === 'yes';
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${yes ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{yes ? '✓ Yes' : '✗ No'}</span>;
}

function Section({ title, children }) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">{title}</h3>
      {children}
    </div>
  );
}

function PocCard({ num, prefix, account, editing, form, setForm }) {
  const nameKey  = `${prefix}_name`;
  const emailKey = `${prefix}_email`;
  const phoneKey = `${prefix}_phone`;
  const desigKey = `${prefix}_designation`;

  const hasData = account[nameKey] || account[emailKey] || account[phoneKey] || account[desigKey];

  if (!editing && !hasData) return null;

  if (!editing) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">POC {num}</p>
        {account[nameKey]  && <p className="text-sm font-semibold text-gray-800">{account[nameKey]}</p>}
        {account[desigKey] && <p className="text-xs text-gray-500">{account[desigKey]}</p>}
        {account[emailKey] && (
          <a href={`mailto:${account[emailKey]}`} className="text-xs text-brand-600 hover:underline block break-all">
            {account[emailKey]}
          </a>
        )}
        {account[phoneKey] && <p className="text-xs text-gray-600">{account[phoneKey]}</p>}
      </div>
    );
  }

  const inp = (key, placeholder) => (
    <input
      type="text"
      placeholder={placeholder}
      value={form[key] || ''}
      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      className="!py-1.5 text-xs"
    />
  );

  return (
    <div className="rounded-lg border border-gray-200 p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">POC {num}</p>
      {inp(nameKey,  'Full name')}
      {inp(desigKey, 'Designation')}
      {inp(emailKey, 'Email')}
      {inp(phoneKey, 'Phone')}
    </div>
  );
}

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios.get(`/api/accounts/${id}`)
      .then(r => {
        const d = r.data;
        if (!d || typeof d !== 'object' || Array.isArray(d)) {
          setError(`Unexpected API response (got ${Array.isArray(d) ? 'array' : typeof d}). Check /api/debug for diagnostics.`);
          return;
        }
        setAccount(d);
        setForm(d);
      })
      .catch(e => {
        const msg = e.response?.data?.error || e.message || 'Unknown error';
        const status = e.response?.status ?? 'network error';
        setError(`API error ${status}: ${msg}. Visit /api/debug to check connectivity.`);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await axios.put(`/api/accounts/${id}`, form);
      setAccount(r.data);
      setForm(r.data);
      setEditing(false);
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="max-w-lg mx-auto mt-16 p-6 bg-red-50 rounded-xl border border-red-200 text-center space-y-3">
      <p className="text-red-700 font-medium">{error}</p>
      <button onClick={() => navigate('/accounts')} className="text-sm text-brand-600 hover:underline">← Back to accounts</button>
    </div>
  );

  if (!account) return null;

  const F = ({ label, field, type = 'text', options }) => {
    if (!editing) return <Field label={label} value={account[field] != null ? String(account[field]) : ''} />;
    return (
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        {options ? (
          <select value={form[field] || ''} onChange={e => setForm(f => ({...f, [field]: e.target.value}))}>
            <option value="">—</option>
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea rows={3} value={form[field] || ''} onChange={e => setForm(f => ({...f, [field]: e.target.value}))} />
        ) : (
          <input type={type} value={form[field] != null ? form[field] : ''} onChange={e => setForm(f => ({...f, [field]: e.target.value}))} />
        )}
      </div>
    );
  };

  const YNF = ({ label, field }) => {
    if (!editing) return <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p><YNBadge value={account[field]} /></div>;
    return (
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        <select value={form[field] || ''} onChange={e => setForm(f => ({...f, [field]: e.target.value}))}>
          <option value="">—</option><option>Yes</option><option>No</option>
        </select>
      </div>
    );
  };

  const hasPocs = !!(account.poc1_name || account.poc1_email || account.poc2_name || account.poc2_email || account.poc3_name || account.poc3_email);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/accounts')} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{account.account_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">ID: {account.tenant_id}</span>
              {account.rag_status && <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${RAG_BADGE[account.rag_status]}`}>{account.rag_status}</span>}
              {account.churn_status && <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-medium">{account.churn_status}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setForm(account); }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Section title="Account Information">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <F label="Account Name" field="account_name" />
              <F label="Tenant ID" field="tenant_id" />
              <F label="Industry" field="industry" />
              <F label="Region" field="region" options={['North','South','East','West']} />
              <F label="MRR Tier" field="mrr_tier" options={['Tier 1 (>500k)','Tier 2 (300k - 500k)','Tier 3 (200k - 300k)']} />
              <F label="MRR (₹)" field="mrr" type="number" />
            </div>
          </Section>

          <Section title="Team & Commercial">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <F label="CSM Lead" field="csm_lead" />
              <F label="CSM" field="csm" />
              <F label="CP" field="cp" />
              <F label="TAM Assigned" field="tam_assigned" />
              <F label="Billing Frequency" field="billing_frequency" options={['Monthly','Quarterly','Half Yearly','Yearly']} />
              <F label="Renewal Date" field="renewal_date" />
              <F label="Renewal Status" field="renewal_status" options={['Renewal Pending','Renewed']} />
              <F label="Closure ETA" field="closure_eta" />
              <F label="SA Status" field="sa_status" options={['Open','Churn']} />
            </div>
          </Section>

          <Section title="Churn & Risk">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <F label="Churn Status" field="churn_status" options={['','Churn Activated','Churn Predicted','Churn Executed','Contraction Predicted']} />
              <F label="Churn Reason" field="churn_reason" />
              <YNF label="Contraction Risk" field="contraction_risk" />
              <YNF label="Churn Risk" field="churn_risk" />
              <F label="GRR (%)" field="grr" type="number" />
              <F label="NPS" field="nps" type="number" />
            </div>
            {(editing || account.renewal_comments) && (
              <div className="mt-4"><F label="Renewal Comments" field="renewal_comments" type="textarea" /></div>
            )}
          </Section>

          <Section title="RAG & Health">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <F label="RAG Status" field="rag_status" options={['Green','Amber','Red']} />
              <F label="Adoption Score" field="adoption_score" type="number" />
              <F label="Stickiness Score" field="stickiness_score" type="number" />
              <F label="Adoption Rate (%)" field="adoption_rate" type="number" />
            </div>
            <div className="space-y-3">
              <F label="RAG Reason" field="rag_reason" type="textarea" />
              <F label="Actions Taken" field="actions_taken" type="textarea" />
            </div>
          </Section>

          <Section title="Implementation">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <F label="Implementation Status" field="implementation_status" />
              <F label="Implementation Type" field="implementation_type" />
              <YNF label="PS Engagement" field="ps_engagement" />
              <YNF label="PS Solutioning" field="ps_solutioning" />
            </div>
          </Section>

          {/* Points of Contact */}
          <Section title="Points of Contact">
            {hasPocs || editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map(n => (
                  <PocCard
                    key={n}
                    num={n}
                    prefix={`poc${n}`}
                    account={account}
                    editing={editing}
                    form={form}
                    setForm={setForm}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <p className="text-sm text-gray-400 italic">No contacts added yet.</p>
                <button onClick={() => setEditing(true)} className="text-xs text-brand-600 hover:underline font-medium">+ Add contacts</button>
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Engagement Checklist">
            <div className="space-y-3">
              <YNF label="Account Understanding Session (CP/PS/CSM)" field="account_understanding_session" />
              <YNF label="New CSM Intro with Client" field="new_csm_intro_done" />
              <YNF label="CSM Escalation Matrix Shared" field="csm_escalation_matrix_shared" />
              <YNF label="Ring Fence Meeting Initiated" field="ring_fence_meeting_initiated" />
              <F label="Meeting Planned Date" field="meeting_planned_date" />
              <YNF label="Meeting Done" field="meeting_done" />
              <YNF label="Issue Mapping Sheet Updated" field="issue_mapping_sheet_updated" />
              <YNF label="Review Cadence Alignment" field="review_cadence_alignment" />
            </div>
          </Section>

          {account.activity_log?.length > 0 && (
            <Section title="Activity Log">
              <div className="space-y-2">
                {account.activity_log.map(log => (
                  <div key={log.id} className="text-xs text-gray-500 border-l-2 border-gray-200 pl-3">
                    <span className="font-medium text-gray-700">{log.user_name}</span> updated this account
                    <br />{new Date(log.created_at).toLocaleString()}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
