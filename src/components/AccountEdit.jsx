import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SelectDropdown from './SelectDropdown';
import DatePicker from './DatePicker';
import TagInput from './TagInput';
import { useMyTeam } from '../hooks/useMyTeam';

/* ── Toggle switch ─────────────────────────────────────────── */
function Toggle({ value, onChange }) {
  const on = value === 'Yes';
  return (
    <button
      type="button"
      onClick={() => onChange(on ? 'No' : 'Yes')}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${on ? 'bg-green-500' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

/* ── Section card ──────────────────────────────────────────── */
function SectionCard({ id, title, icon, accent, children, cols2 }) {
  return (
    <div id={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-28">
      <div className={`flex items-center gap-3 px-5 py-3.5 ${accent} border-b border-black/[0.05]`}>
        <div className="w-7 h-7 rounded-lg bg-white/70 backdrop-blur flex items-center justify-center shadow-sm shrink-0">
          {icon}
        </div>
        <h3 className="text-sm font-bold text-gray-700">{title}</h3>
      </div>
      <div className={`p-5 grid gap-x-5 gap-y-4 ${cols2 === false ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {children}
      </div>
    </div>
  );
}

/* ── Field wrapper ─────────────────────────────────────────── */
function Field({ label, children, full, hint }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

/* ── Input styles ──────────────────────────────────────────── */
const inp = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition placeholder:text-gray-300';
const sel = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition cursor-pointer';
const ta  = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition resize-none';

/* ── Prefixed number input ─────────────────────────────────── */
function PrefixInput({ prefix, ...props }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none select-none">{prefix}</span>
      <input {...props} className={`${inp} pl-8`} />
    </div>
  );
}

/* ── RAG color picker ──────────────────────────────────────── */
const RAG_CONFIG = [
  { v: 'Green', dot: 'bg-green-500', active: 'bg-green-50 border-green-400 text-green-700', inactive: 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300' },
  { v: 'Amber', dot: 'bg-amber-400', active: 'bg-amber-50 border-amber-400 text-amber-700', inactive: 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300' },
  { v: 'Red',   dot: 'bg-red-500',   active: 'bg-red-50 border-red-400 text-red-700',       inactive: 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300' },
];

function RagPicker({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {RAG_CONFIG.map(({ v, dot, active, inactive }) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${value === v ? active : inactive}`}>
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${value === v ? dot : 'bg-gray-300'}`} />
          {v}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════ */
export default function AccountEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { teamNames, isAdmin: isTeamAdmin } = useMyTeam();
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [saveErr, setSaveErr] = useState(null);
  const [form, setForm] = useState({});
  const [csms, setCsms] = useState([]);
  const [csmLeads, setCsmLeads] = useState([]);
  const [csmLeadMap, setCsmLeadMap] = useState({});
  const [tiers, setTiers] = useState([]);
  const [ddConfig, setDdConfig] = useState({});

  useEffect(() => {
    axios.get('/api/accounts?mode=filters')
      .then(r => {
        setCsms(r.data.csms || []);
        setCsmLeads(r.data.csmLeads || []);
        setCsmLeadMap(r.data.csmLeadMap || {});
        setTiers(r.data.tiers || []);
      }).catch(() => {});
    axios.get('/api/dropdown-config')
      .then(r => setDdConfig(r.data || {})).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/accounts/${id}`)
      .then(r => {
        const d = r.data;
        const fields = [
          'account_name','tenant_id','industry','mrr_tier','mrr','region','golive_date',
          'csm_lead','csm','cp','tam_assigned','billing_frequency','renewal_date',
          'renewal_status','closure_eta','sa_status',
          'churn_status','churn_reason','grr','nps','renewal_comments',
          'contraction_risk','churn_risk',
          'rag_status','adoption_score','stickiness_score','adoption_rate','rag_reason','actions_taken',
          'implementation_status','implementation_type','ps_engagement','ps_solutioning',
          'poc1_name','poc1_email','poc1_phone','poc1_designation',
          'poc2_name','poc2_email','poc2_phone','poc2_designation',
          'poc3_name','poc3_email','poc3_phone','poc3_designation',
          'account_understanding_session','new_csm_intro_done','csm_escalation_matrix_shared',
          'ring_fence_meeting_initiated','meeting_planned_date','meeting_done',
          'issue_mapping_sheet_updated','review_cadence_alignment',
        ];
        const init = {};
        fields.forEach(f => { init[f] = d[f] ?? ''; });
        setForm(init);
      })
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (field, value) => {
    setForm(f => {
      const next = { ...f, [field]: value };
      if (field === 'csm' && csmLeadMap[value]) next.csm_lead = csmLeadMap[value];
      return next;
    });
  };

  const opts = (key, fallback = []) =>
    (ddConfig[key]?.length ? ddConfig[key].map(o => o.value) : fallback);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveErr(null);
    try {
      await axios.put(`/api/accounts/${id}`, form);
      navigate(`/accounts/${id}`);
    } catch (err) {
      setSaveErr(err.response?.data?.error || err.message);
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
      <p className="text-red-700">{error}</p>
      <button onClick={() => navigate(`/accounts/${id}`)} className="text-sm text-brand-600 hover:underline">← Back</button>
    </div>
  );

  const rfItems = [
    { label: 'Account Understanding Session', field: 'account_understanding_session' },
    { label: 'New CSM Intro with Client',     field: 'new_csm_intro_done' },
    { label: 'CSM Escalation Matrix Shared',  field: 'csm_escalation_matrix_shared' },
    { label: 'Ring Fence Meeting Initiated',  field: 'ring_fence_meeting_initiated' },
    { label: 'Meeting Done',                  field: 'meeting_done' },
    { label: 'Issue Mapping Sheet Updated',   field: 'issue_mapping_sheet_updated' },
    { label: 'Review Cadence Alignment',      field: 'review_cadence_alignment' },
  ];
  const rfDone = rfItems.filter(i => form[i.field] === 'Yes').length;

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5 pb-10">

      {/* ── Sticky header ──────────────────────────────────────── */}
      <div className="sticky top-14 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={() => navigate(`/accounts/${id}`)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Editing Account</p>
            <p className="text-sm font-bold text-gray-800 truncate">{form.account_name || `Account #${id}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => navigate(`/accounts/${id}`)}
            className="px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition disabled:opacity-60 flex items-center gap-2 shadow-sm">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {saveErr && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {saveErr}
        </div>
      )}

      {/* ── Account Information ─────────────────────────────────── */}
      <SectionCard id="s-info" title="Account Information" accent="bg-blue-50"
        icon={<svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
      >
        <Field label="Account Name" full>
          <input className={inp} value={form.account_name || ''} onChange={e => set('account_name', e.target.value)} placeholder="Company name" />
        </Field>
        <Field label="Tenant ID" hint="Press Enter or comma to add multiple tenant IDs">
          <TagInput value={form.tenant_id || ''} onChange={v => set('tenant_id', v)} placeholder="e.g. 5528" />
        </Field>
        <Field label="Region">
          <SelectDropdown options={['North','South','East','West']} value={form.region || ''} onChange={v => set('region', v)} placeholder="— Select Region —" />
        </Field>
        <Field label="Go-live Date">
          <DatePicker value={form.golive_date ? form.golive_date.substring(0,10) : ''} onChange={v => set('golive_date', v)} placeholder="Pick a date" />
        </Field>
        <Field label="Industry">
          <input className={inp} value={form.industry || ''} onChange={e => set('industry', e.target.value)} placeholder="e.g. Real Estate" />
        </Field>
        <Field label="MRR Tier">
          <SelectDropdown options={tiers} value={form.mrr_tier || ''} onChange={v => set('mrr_tier', v)} placeholder="— Select tier —" />
        </Field>
        <Field label="MRR (₹)">
          <PrefixInput prefix="₹" type="number" value={form.mrr || ''} onChange={e => set('mrr', e.target.value)} placeholder="0" />
        </Field>
      </SectionCard>

      {/* ── Team & Commercial ───────────────────────────────────── */}
      <SectionCard id="s-team" title="Team & Commercial" accent="bg-violet-50"
        icon={<svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
      >
        <Field label="CSM">
          <SelectDropdown options={isTeamAdmin ? csms : (teamNames ?? csms)} value={form.csm || ''} onChange={v => set('csm', v)} placeholder="— Select CSM —" />
        </Field>
        <Field label="CSM Lead">
          <SelectDropdown options={csmLeads} value={form.csm_lead || ''} onChange={v => set('csm_lead', v)} placeholder="— Select Lead —" />
        </Field>
        <Field label="CP">
          <input className={inp} value={form.cp || ''} onChange={e => set('cp', e.target.value)} placeholder="Channel partner" />
        </Field>
        <Field label="SA Status">
          <input className={inp} value={form.sa_status || ''} onChange={e => set('sa_status', e.target.value)} placeholder="e.g. Open" />
        </Field>
        <Field label="TAM Assigned">
          <SelectDropdown options={['Yes','No']} value={form.tam_assigned || ''} onChange={v => set('tam_assigned', v)} />
        </Field>
        <Field label="Billing Frequency">
          <SelectDropdown options={opts('billing_frequency', ['Monthly','Quarterly','Half-Yearly','Annually'])} value={form.billing_frequency || ''} onChange={v => set('billing_frequency', v)} />
        </Field>
        <Field label="Renewal Date">
          <DatePicker value={form.renewal_date ? form.renewal_date.substring(0,10) : ''} onChange={v => set('renewal_date', v)} placeholder="Pick a date" />
        </Field>
        <Field label="Renewal Status">
          <SelectDropdown options={opts('renewal_status', ['Renewed','At Risk','Lost','Pending'])} value={form.renewal_status || ''} onChange={v => set('renewal_status', v)} />
        </Field>
        <Field label="Closure ETA">
          <DatePicker value={form.closure_eta ? form.closure_eta.substring(0,10) : ''} onChange={v => set('closure_eta', v)} placeholder="Pick a date" />
        </Field>
      </SectionCard>

      {/* ── Churn & Risk ───────────────────────────────────────── */}
      <SectionCard id="s-risk" title="Churn & Risk" accent="bg-orange-50"
        icon={<svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
      >
        <Field label="Churn Status">
          <SelectDropdown options={opts('churn_status', ['Churn Activated','Churn Predicted','Churn Executed','Contraction Predicted'])} value={form.churn_status || ''} onChange={v => set('churn_status', v)} placeholder="— None —" />
        </Field>
        <Field label="Contraction Risk">
          <SelectDropdown options={opts('contraction_risk', ['High','Medium','Low','None'])} value={form.contraction_risk || ''} onChange={v => set('contraction_risk', v)} />
        </Field>
        <Field label="Churn Risk">
          <SelectDropdown options={opts('churn_risk', ['High','Medium','Low','None'])} value={form.churn_risk || ''} onChange={v => set('churn_risk', v)} />
        </Field>
        <Field label="GRR (%)">
          <div className="relative">
            <input type="number" min="0" max="100" className={inp} value={form.grr ?? ''} onChange={e => set('grr', e.target.value)} placeholder="0–100" />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
          </div>
        </Field>
        <Field label="NPS">
          <input type="number" min="-100" max="100" className={inp} value={form.nps ?? ''} onChange={e => set('nps', e.target.value)} placeholder="-100 to 100" />
        </Field>
        <Field label="Churn Reason" full>
          <input className={inp} value={form.churn_reason || ''} onChange={e => set('churn_reason', e.target.value)} placeholder="Reason for churn…" />
        </Field>
        <Field label="Renewal Comments" full>
          <textarea rows={3} className={ta} value={form.renewal_comments || ''} onChange={e => set('renewal_comments', e.target.value)} placeholder="Notes on renewal…" />
        </Field>
      </SectionCard>

      {/* ── RAG & Health ───────────────────────────────────────── */}
      <SectionCard id="s-rag" title="RAG & Health" accent="bg-emerald-50"
        icon={<svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
      >
        <Field label="RAG Status" full>
          <RagPicker value={form.rag_status} onChange={v => set('rag_status', v)} />
        </Field>
        <Field label="Adoption Score">
          <input type="number" className={inp} value={form.adoption_score ?? ''} onChange={e => set('adoption_score', e.target.value)} placeholder="0–100" />
        </Field>
        <Field label="Stickiness Score">
          <input type="number" className={inp} value={form.stickiness_score ?? ''} onChange={e => set('stickiness_score', e.target.value)} placeholder="Score" />
        </Field>
        <Field label="Adoption Rate (%)">
          <div className="relative">
            <input type="number" min="0" max="100" className={inp} value={form.adoption_rate ?? ''} onChange={e => set('adoption_rate', e.target.value)} placeholder="0–100" />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
          </div>
        </Field>
        <Field label="RAG Reason" full>
          <textarea rows={3} className={ta} value={form.rag_reason || ''} onChange={e => set('rag_reason', e.target.value)} placeholder="Why is the account at this RAG status?" />
        </Field>
        <Field label="Actions Taken" full>
          <textarea rows={3} className={ta} value={form.actions_taken || ''} onChange={e => set('actions_taken', e.target.value)} placeholder="What actions have been taken?" />
        </Field>
      </SectionCard>

      {/* ── Implementation ─────────────────────────────────────── */}
      <SectionCard id="s-impl" title="Implementation" accent="bg-slate-50"
        icon={<svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
      >
        <Field label="Implementation Status">
          <SelectDropdown options={opts('implementation_status', ['Not Started','In Progress','Completed','On Hold'])} value={form.implementation_status || ''} onChange={v => set('implementation_status', v)} />
        </Field>
        <Field label="Implementation Type">
          <input className={inp} value={form.implementation_type || ''} onChange={e => set('implementation_type', e.target.value)} placeholder="e.g. Self-serve" />
        </Field>
        <Field label="PS Engagement">
          <SelectDropdown options={['Yes','No']} value={form.ps_engagement || ''} onChange={v => set('ps_engagement', v)} />
        </Field>
        <Field label="PS Solutioning">
          <input className={inp} value={form.ps_solutioning || ''} onChange={e => set('ps_solutioning', e.target.value)} placeholder="Notes" />
        </Field>
      </SectionCard>

      {/* ── Points of Contact ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 bg-teal-50 border-b border-black/[0.05]">
          <div className="w-7 h-7 rounded-lg bg-white/70 backdrop-blur flex items-center justify-center shadow-sm shrink-0">
            <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <h3 className="text-sm font-bold text-gray-700">Points of Contact</h3>
        </div>
        <div className="p-5 space-y-4">
          {[1, 2, 3].map(n => {
            const hasData = form[`poc${n}_name`] || form[`poc${n}_email`];
            return (
              <div key={n} className="rounded-xl border border-gray-100 overflow-hidden">
                <div className={`flex items-center gap-3 px-4 py-2.5 ${hasData ? 'bg-teal-50/60' : 'bg-gray-50/60'} border-b border-gray-100`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${hasData ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>
                    {hasData ? (form[`poc${n}_name`] || '?')[0].toUpperCase() : n}
                  </div>
                  <span className="text-sm font-semibold text-gray-600">
                    {hasData ? form[`poc${n}_name`] || 'Contact' : `Contact ${n}`}
                  </span>
                  {!hasData && <span className="ml-auto text-[11px] text-gray-300 font-medium">Optional</span>}
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Name">
                    <input className={inp} value={form[`poc${n}_name`] || ''} onChange={e => set(`poc${n}_name`, e.target.value)} placeholder="Full name" />
                  </Field>
                  <Field label="Designation">
                    <input className={inp} value={form[`poc${n}_designation`] || ''} onChange={e => set(`poc${n}_designation`, e.target.value)} placeholder="e.g. VP Operations" />
                  </Field>
                  <Field label="Email">
                    <input type="email" className={inp} value={form[`poc${n}_email`] || ''} onChange={e => set(`poc${n}_email`, e.target.value)} placeholder="name@company.com" />
                  </Field>
                  <Field label="Phone">
                    <input className={inp} value={form[`poc${n}_phone`] || ''} onChange={e => set(`poc${n}_phone`, e.target.value)} placeholder="+91 98765 43210" />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Ring Fence Status ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 bg-indigo-50 border-b border-black/[0.05]">
          <div className="w-7 h-7 rounded-lg bg-white/70 backdrop-blur flex items-center justify-center shadow-sm shrink-0">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-700">Ring Fence Status</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${rfDone === rfItems.length ? 'bg-green-500' : rfDone > 3 ? 'bg-amber-400' : 'bg-indigo-400'}`}
                style={{ width: `${Math.round(rfDone / rfItems.length * 100)}%` }} />
            </div>
            <span className={`text-xs font-bold ${rfDone === rfItems.length ? 'text-green-600' : 'text-gray-400'}`}>{rfDone}/{rfItems.length}</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {rfItems.map(({ label, field }) => (
            <div key={field} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-4 h-4 shrink-0 rounded-full flex items-center justify-center ${form[field] === 'Yes' ? 'bg-green-500' : 'bg-gray-100'}`}>
                  {form[field] === 'Yes' && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`text-sm ${form[field] === 'Yes' ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>{label}</span>
              </div>
              <Toggle value={form[field]} onChange={v => set(field, v)} />
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm text-gray-500">Meeting Planned Date</span>
            <DatePicker value={form.meeting_planned_date ? form.meeting_planned_date.substring(0,10) : ''} onChange={v => set('meeting_planned_date', v)} placeholder="Pick a date" className="w-48" />
          </div>
        </div>
      </div>

      {/* ── Footer save ────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => navigate(`/accounts/${id}`)}
          className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition disabled:opacity-60 flex items-center gap-2 shadow-sm">
          {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
