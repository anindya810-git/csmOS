import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const YN_OPTS = ['Yes', 'No'];

function Section({ title, children }) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100 mb-4">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent';
const selectCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white';
const textareaCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none';

export default function AccountEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [form, setForm] = useState({});
  const [csms, setCsms] = useState([]);
  const [csmLeads, setCsmLeads] = useState([]);
  const [csmLeadMap, setCsmLeadMap] = useState({});
  const [tiers, setTiers] = useState([]);
  const [ddConfig, setDdConfig] = useState({});

  useEffect(() => {
    axios.get('/api/accounts/filters')
      .then(r => {
        setCsms(r.data.csms || []);
        setCsmLeads(r.data.csmLeads || []);
        setCsmLeadMap(r.data.csmLeadMap || {});
        setTiers(r.data.tiers || []);
      })
      .catch(() => {});
    axios.get('/api/dropdown-config')
      .then(r => setDdConfig(r.data || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/accounts/${id}`)
      .then(r => {
        const d = r.data;
        const init = {};
        const fields = [
          'account_name','tenant_id','industry','mrr_tier','mrr','region',
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
    setSaving(true);
    setSaveError(null);
    try {
      await axios.put(`/api/accounts/${id}`, form);
      navigate(`/accounts/${id}`);
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/accounts/${id}`)}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edit Account</h1>
            <p className="text-sm text-gray-400 mt-0.5">{form.account_name || `Account #${id}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/accounts/${id}`)}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition disabled:opacity-60 flex items-center gap-2"
          >
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {saveError}
        </div>
      )}

      {/* Account Information */}
      <Section title="Account Information">
        <Field label="Account Name">
          <input className={inputCls} value={form.account_name || ''} onChange={e => set('account_name', e.target.value)} />
        </Field>
        <Field label="Tenant ID">
          <input className={inputCls} value={form.tenant_id || ''} onChange={e => set('tenant_id', e.target.value)} />
        </Field>
        <Field label="Industry">
          <input className={inputCls} value={form.industry || ''} onChange={e => set('industry', e.target.value)} />
        </Field>
        <Field label="Region">
          <input className={inputCls} value={form.region || ''} onChange={e => set('region', e.target.value)} />
        </Field>
        <Field label="MRR Tier">
          <select className={selectCls} value={form.mrr_tier || ''} onChange={e => set('mrr_tier', e.target.value)}>
            <option value="">— Select —</option>
            {tiers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="MRR (₹)">
          <input type="number" className={inputCls} value={form.mrr || ''} onChange={e => set('mrr', e.target.value)} />
        </Field>
      </Section>

      {/* Team & Commercial */}
      <Section title="Team & Commercial">
        <Field label="CSM">
          <select className={selectCls} value={form.csm || ''} onChange={e => set('csm', e.target.value)}>
            <option value="">— Select —</option>
            {csms.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="CSM Lead">
          <select className={selectCls} value={form.csm_lead || ''} onChange={e => set('csm_lead', e.target.value)}>
            <option value="">— Select —</option>
            {csmLeads.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="CP">
          <input className={inputCls} value={form.cp || ''} onChange={e => set('cp', e.target.value)} />
        </Field>
        <Field label="TAM Assigned">
          <select className={selectCls} value={form.tam_assigned || ''} onChange={e => set('tam_assigned', e.target.value)}>
            <option value="">— Select —</option>
            {YN_OPTS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="SA Status">
          <input className={inputCls} value={form.sa_status || ''} onChange={e => set('sa_status', e.target.value)} />
        </Field>
        <Field label="Billing Frequency">
          <select className={selectCls} value={form.billing_frequency || ''} onChange={e => set('billing_frequency', e.target.value)}>
            <option value="">— Select —</option>
            {opts('billing_frequency', ['Monthly','Quarterly','Half-Yearly','Annually']).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Renewal Date">
          <input type="date" className={inputCls} value={form.renewal_date ? form.renewal_date.substring(0, 10) : ''} onChange={e => set('renewal_date', e.target.value)} />
        </Field>
        <Field label="Renewal Status">
          <select className={selectCls} value={form.renewal_status || ''} onChange={e => set('renewal_status', e.target.value)}>
            <option value="">— Select —</option>
            {opts('renewal_status', ['Renewed','At Risk','Lost','Pending']).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Closure ETA">
          <input type="date" className={inputCls} value={form.closure_eta ? form.closure_eta.substring(0, 10) : ''} onChange={e => set('closure_eta', e.target.value)} />
        </Field>
      </Section>

      {/* Churn & Risk */}
      <Section title="Churn & Risk">
        <Field label="Churn Status">
          <select className={selectCls} value={form.churn_status || ''} onChange={e => set('churn_status', e.target.value)}>
            <option value="">— None —</option>
            {opts('churn_status', ['Churn Activated','Churn Predicted','Churn Executed','Contraction Predicted']).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Contraction Risk">
          <select className={selectCls} value={form.contraction_risk || ''} onChange={e => set('contraction_risk', e.target.value)}>
            <option value="">— Select —</option>
            {opts('contraction_risk', ['High','Medium','Low','None']).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Churn Risk">
          <select className={selectCls} value={form.churn_risk || ''} onChange={e => set('churn_risk', e.target.value)}>
            <option value="">— Select —</option>
            {opts('churn_risk', ['High','Medium','Low','None']).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="GRR (%)">
          <input type="number" min="0" max="100" className={inputCls} value={form.grr ?? ''} onChange={e => set('grr', e.target.value)} />
        </Field>
        <Field label="NPS">
          <input type="number" min="-100" max="100" className={inputCls} value={form.nps ?? ''} onChange={e => set('nps', e.target.value)} />
        </Field>
        <Field label="Churn Reason" full>
          <input className={inputCls} value={form.churn_reason || ''} onChange={e => set('churn_reason', e.target.value)} />
        </Field>
        <Field label="Renewal Comments" full>
          <textarea rows={3} className={textareaCls} value={form.renewal_comments || ''} onChange={e => set('renewal_comments', e.target.value)} />
        </Field>
      </Section>

      {/* RAG & Health */}
      <Section title="RAG & Health">
        <Field label="RAG Status">
          <select className={selectCls} value={form.rag_status || ''} onChange={e => set('rag_status', e.target.value)}>
            <option value="">— Select —</option>
            {opts('rag_status', ['Green','Amber','Red']).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Adoption Score">
          <input type="number" className={inputCls} value={form.adoption_score ?? ''} onChange={e => set('adoption_score', e.target.value)} />
        </Field>
        <Field label="Stickiness Score">
          <input type="number" className={inputCls} value={form.stickiness_score ?? ''} onChange={e => set('stickiness_score', e.target.value)} />
        </Field>
        <Field label="Adoption Rate (%)">
          <input type="number" min="0" max="100" className={inputCls} value={form.adoption_rate ?? ''} onChange={e => set('adoption_rate', e.target.value)} />
        </Field>
        <Field label="RAG Reason" full>
          <textarea rows={3} className={textareaCls} value={form.rag_reason || ''} onChange={e => set('rag_reason', e.target.value)} />
        </Field>
        <Field label="Actions Taken" full>
          <textarea rows={3} className={textareaCls} value={form.actions_taken || ''} onChange={e => set('actions_taken', e.target.value)} />
        </Field>
      </Section>

      {/* Implementation */}
      <Section title="Implementation">
        <Field label="Implementation Status">
          <select className={selectCls} value={form.implementation_status || ''} onChange={e => set('implementation_status', e.target.value)}>
            <option value="">— Select —</option>
            {opts('implementation_status', ['Not Started','In Progress','Completed','On Hold']).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Implementation Type">
          <input className={inputCls} value={form.implementation_type || ''} onChange={e => set('implementation_type', e.target.value)} />
        </Field>
        <Field label="PS Engagement">
          <select className={selectCls} value={form.ps_engagement || ''} onChange={e => set('ps_engagement', e.target.value)}>
            <option value="">— Select —</option>
            {YN_OPTS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="PS Solutioning">
          <input className={inputCls} value={form.ps_solutioning || ''} onChange={e => set('ps_solutioning', e.target.value)} />
        </Field>
      </Section>

      {/* Points of Contact */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100 mb-4">Points of Contact</h3>
        <div className="space-y-5">
          {[1, 2, 3].map(n => (
            <div key={n}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">POC {n}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name">
                  <input className={inputCls} value={form[`poc${n}_name`] || ''} onChange={e => set(`poc${n}_name`, e.target.value)} />
                </Field>
                <Field label="Designation">
                  <input className={inputCls} value={form[`poc${n}_designation`] || ''} onChange={e => set(`poc${n}_designation`, e.target.value)} />
                </Field>
                <Field label="Email">
                  <input type="email" className={inputCls} value={form[`poc${n}_email`] || ''} onChange={e => set(`poc${n}_email`, e.target.value)} />
                </Field>
                <Field label="Phone">
                  <input className={inputCls} value={form[`poc${n}_phone`] || ''} onChange={e => set(`poc${n}_phone`, e.target.value)} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ring Fence Status */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100 mb-4">Ring Fence Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Account Understanding Session', field: 'account_understanding_session' },
            { label: 'New CSM Intro with Client',     field: 'new_csm_intro_done' },
            { label: 'CSM Escalation Matrix Shared',  field: 'csm_escalation_matrix_shared' },
            { label: 'Ring Fence Meeting Initiated',  field: 'ring_fence_meeting_initiated' },
            { label: 'Meeting Done',                  field: 'meeting_done' },
            { label: 'Issue Mapping Sheet Updated',   field: 'issue_mapping_sheet_updated' },
            { label: 'Review Cadence Alignment',      field: 'review_cadence_alignment' },
          ].map(({ label, field }) => (
            <Field key={field} label={label}>
              <select className={selectCls} value={form[field] || ''} onChange={e => set(field, e.target.value)}>
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
          ))}
          <Field label="Meeting Planned Date">
            <input
              type="date"
              className={inputCls}
              value={form.meeting_planned_date ? form.meeting_planned_date.substring(0, 10) : ''}
              onChange={e => set('meeting_planned_date', e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex justify-end gap-3 pb-6">
        <button
          type="button"
          onClick={() => navigate(`/accounts/${id}`)}
          className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition disabled:opacity-60 flex items-center gap-2"
        >
          {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
