import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const STATUS_STYLES = {
  'Resolved':       'bg-green-100 text-green-800',
  'In Progress':    'bg-amber-100 text-amber-800',
  'Partly Resolved':'bg-blue-100 text-blue-800',
  'Open':           'bg-red-100 text-red-800',
};

const RAG_BADGE = { Green: 'bg-green-100 text-green-800', Amber: 'bg-amber-100 text-amber-800', Red: 'bg-red-100 text-red-800' };

const MON_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function toDateInput(str) {
  if (!str) return '';
  const m1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m1) {
    const y = m1[3].length === 2 ? 2000 + +m1[3] : +m1[3];
    return `${y}-${String(+m1[2]).padStart(2,'0')}-${String(+m1[1]).padStart(2,'0')}`;
  }
  const m2 = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (m2) {
    const y = m2[3].length === 2 ? 2000 + +m2[3] : +m2[3];
    const mo = MON_NAMES.findIndex(n => n.toLowerCase() === m2[2].toLowerCase());
    if (mo >= 0) return `${y}-${String(mo+1).padStart(2,'0')}-${String(+m2[1]).padStart(2,'0')}`;
  }
  return '';
}

function fromDateInput(str) {
  if (!str) return '';
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return str;
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

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between pb-2 border-b border-gray-100 mb-4 group"
      >
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${open ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && children}
    </div>
  );
}

function PocViewCard({ n, account }) {
  const name  = account[`poc${n}_name`];
  const email = account[`poc${n}_email`];
  const phone = account[`poc${n}_phone`];
  const desig = account[`poc${n}_designation`];
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contact {n}</p>
      {name  && <p className="text-sm font-semibold text-gray-800">{name}</p>}
      {desig && <p className="text-xs text-gray-500">{desig}</p>}
      {email && <a href={`mailto:${email}`} className="text-xs text-brand-600 hover:underline block break-all">{email}</a>}
      {phone && <p className="text-xs text-gray-600">{phone}</p>}
    </div>
  );
}

function PocEditCard({ n, form, setForm, onRemove }) {
  const inp = (field, placeholder) => (
    <input type="text" placeholder={placeholder} value={form[field] || ''}
      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
      className="!py-1.5 text-xs" />
  );
  return (
    <div className="rounded-lg border border-gray-200 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact {n}</p>
        <button type="button" onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">Remove</button>
      </div>
      {inp(`poc${n}_name`,        'Full name')}
      {inp(`poc${n}_designation`, 'Designation')}
      {inp(`poc${n}_email`,       'Email')}
      {inp(`poc${n}_phone`,       'Phone')}
    </div>
  );
}

const OWNERSHIP_OPTIONS = ['CSM','PS','CSM + PS','PS + CSM','Support + CSM','Sales + CSM','CSM + CP','CSM + CP + PS','CSM + PS + Engg','PS + CSM + Support','CSM + Engg + Support','CSM + Engg + PS','Support + Engg + PS + CSM','PS DEV + Product + CSM','Support + Product + CSM','CSM + Billings','Product'];
const ESCALATED_BY_OPTIONS = ['CSM','Vivek','Pritam','Vivek / Pritam','Nilesh','Prashant'];
const PS_LEADER_OPTIONS = ['Hirak','Ambrish'];

const EMPTY_ESCAL = {
  date_of_escalation: '', month: '', description: '', action_taken: '',
  ownership: '', status: 'Open', csm: '', eta: '', email_subject: '',
  ps_leader: '', escalated_by: '',
};

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account,      setAccount]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [editing,      setEditing]      = useState(false);
  const [form,         setForm]         = useState({});
  const [saving,       setSaving]       = useState(false);
  const [pocSlots,     setPocSlots]     = useState([]);
  const [csms,         setCsms]         = useState([]);
  const [escalations,  setEscalations]  = useState([]);
  const [showEscalForm,setShowEscalForm]= useState(false);
  const [escalForm,    setEscalForm]    = useState(EMPTY_ESCAL);
  const [escalSaving,  setEscalSaving]  = useState(false);
  const [escalExpanded,setEscalExpanded]= useState(null);

  useEffect(() => {
    axios.get('/api/accounts/filters').then(r => setCsms(r.data.csms || [])).catch(() => {});
  }, []);

  const loadEscalations = () => {
    axios.get(`/api/escalations?account_id=${id}`)
      .then(r => setEscalations(r.data || []))
      .catch(() => {});
  };

  const startEditing = (acc) => {
    const used = [1,2,3].filter(n =>
      acc[`poc${n}_name`] || acc[`poc${n}_email`] || acc[`poc${n}_phone`] || acc[`poc${n}_designation`]
    );
    setPocSlots(used);
    setEditing(true);
  };

  const addPocSlot = () => {
    const next = [1,2,3].find(n => !pocSlots.includes(n));
    if (next) setPocSlots(s => [...s, next]);
  };

  const removePocSlot = (n) => {
    setPocSlots(s => s.filter(x => x !== n));
    setForm(f => ({ ...f, [`poc${n}_name`]: '', [`poc${n}_email`]: '', [`poc${n}_phone`]: '', [`poc${n}_designation`]: '' }));
  };

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
    loadEscalations();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await axios.put(`/api/accounts/${id}`, form);
      setAccount(r.data);
      setForm(r.data);
      setPocSlots([]);
      setEditing(false);
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEscalation = async () => {
    setEscalSaving(true);
    try {
      await axios.post('/api/escalations', {
        ...escalForm,
        account_id: Number(id),
        account_name: account?.account_name,
        tenant_id: account?.tenant_id,
      });
      setShowEscalForm(false);
      setEscalForm(EMPTY_ESCAL);
      loadEscalations();
    } catch (e) {
      alert('Failed to save escalation: ' + (e.response?.data?.error || e.message));
    } finally {
      setEscalSaving(false);
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
        {options?.length ? (
          <select value={form[field] || ''} onChange={e => setForm(f => ({...f, [field]: e.target.value}))}>
            <option value="">—</option>
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea rows={3} value={form[field] || ''} onChange={e => setForm(f => ({...f, [field]: e.target.value}))} />
        ) : type === 'date' ? (
          <input type="date" value={toDateInput(form[field] || '')}
            onChange={e => setForm(f => ({...f, [field]: fromDateInput(e.target.value)}))} />
        ) : (
          <input type={type} value={form[field] != null ? form[field] : ''} onChange={e => setForm(f => ({...f, [field]: e.target.value}))} />
        )}
      </div>
    );
  };

  const MultiIdF = ({ label, field }) => {
    const raw = account[field] || '';
    const ids = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!editing) return (
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {ids.length ? ids.map(id => (
            <span key={id} className="inline-block text-xs bg-gray-100 text-gray-700 border border-gray-200 rounded px-1.5 py-0.5 font-mono">{id}</span>
          )) : <span className="text-sm text-gray-300">—</span>}
        </div>
      </div>
    );
    return (
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        <input type="text" value={form[field] || ''} placeholder="Separate multiple IDs with commas"
          onChange={e => setForm(f => ({...f, [field]: e.target.value}))} />
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

  const viewPocs = [1,2,3].filter(n =>
    account[`poc${n}_name`] || account[`poc${n}_email`] || account[`poc${n}_phone`] || account[`poc${n}_designation`]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/accounts')} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 break-words">{account.account_name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">ID: {account.tenant_id}</span>
              {account.rag_status && <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${RAG_BADGE[account.rag_status]}`}>{account.rag_status}</span>}
              {account.churn_status && <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-medium">{account.churn_status}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setForm(account); setPocSlots([]); }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button onClick={() => startEditing(account)} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition">
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
              <MultiIdF label="Tenant ID" field="tenant_id" />
              <F label="Industry" field="industry" />
              <F label="Region" field="region" options={['North','South','East','West']} />
              <F label="MRR Tier" field="mrr_tier" options={['Tier 1 (>500k)','Tier 2 (300k - 500k)','Tier 3 (200k - 300k)']} />
              <F label="MRR (₹)" field="mrr" type="number" />
            </div>
          </Section>

          <Section title="Team & Commercial">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <F label="CSM Lead" field="csm_lead" options={csms} />
              <F label="CSM" field="csm" options={csms} />
              <F label="CP" field="cp" />
              <F label="TAM Assigned" field="tam_assigned" />
              <F label="Billing Frequency" field="billing_frequency" options={['Monthly','Quarterly','Half Yearly','Yearly']} />
              <F label="Renewal Date" field="renewal_date" type="date" />
              <F label="Renewal Status" field="renewal_status" options={['Renewal Pending','Renewed']} />
              <F label="Closure ETA" field="closure_eta" type="date" />
              <F label="SA Status" field="sa_status" options={['Open','Churn']} />
            </div>
          </Section>

          <Section title="Churn & Risk">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <F label="Churn Status" field="churn_status" options={['','Churn Activated','Churn Predicted','Churn Executed','Contraction Predicted']} />
              <F label="Churn Reason" field="churn_reason" />
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
              <F label="Implementation Status" field="implementation_status" options={['Active','Hypercare','Planned']} />
              <F label="Implementation Type" field="implementation_type" options={['New','CR Paid','CR FOC','Reimplementation']} />
              <F label="PS Engagement" field="ps_engagement" />
              <F label="PS Solutioning" field="ps_solutioning" />
            </div>
          </Section>

          {/* Points of Contact */}
          <Section title="Points of Contact">
            {!editing && viewPocs.length === 0 && (
              <p className="text-sm text-gray-400 italic py-1">No contacts yet. Click Edit to add.</p>
            )}
            {!editing && viewPocs.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {viewPocs.map(n => <PocViewCard key={n} n={n} account={account} />)}
              </div>
            )}
            {editing && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {pocSlots.map(n => (
                    <PocEditCard key={n} n={n} form={form} setForm={setForm}
                      onRemove={() => removePocSlot(n)} />
                  ))}
                </div>
                {pocSlots.length < 3 && (
                  <button type="button" onClick={addPocSlot}
                    className="text-sm text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Contact
                  </button>
                )}
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

      {/* Escalations Section */}
      <Section title={`Escalations${escalations.length ? ` (${escalations.length})` : ''}`} defaultOpen={escalations.length > 0}>
        {escalations.length === 0 && !showEscalForm && (
          <p className="text-sm text-gray-400 italic mb-3">No escalations recorded for this account.</p>
        )}

        {escalations.length > 0 && (
          <div className="space-y-2 mb-4">
            {escalations.map(e => (
              <div key={e.id} className="rounded-lg border border-gray-100 overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-left"
                  onClick={() => setEscalExpanded(escalExpanded === e.id ? null : e.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[e.status] || 'bg-gray-100 text-gray-700'}`}>{e.status}</span>
                    <span className="text-sm font-medium text-gray-800 truncate">{e.description?.substring(0, 80)}{e.description?.length > 80 ? '…' : ''}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs text-gray-400">{e.date_of_escalation ? new Date(e.date_of_escalation).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : ''}</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${escalExpanded === e.id ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>
                {escalExpanded === e.id && (
                  <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{e.description}</p>
                      </div>
                      {e.action_taken && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Action Taken</p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{e.action_taken}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      {e.ownership && <span><span className="font-medium">Ownership:</span> {e.ownership}</span>}
                      {e.csm && <span><span className="font-medium">CSM:</span> {e.csm}</span>}
                      {e.eta && <span><span className="font-medium">ETA:</span> {e.eta}</span>}
                      {e.ps_leader && <span><span className="font-medium">PS Leader:</span> {e.ps_leader}</span>}
                      {e.escalated_by && <span><span className="font-medium">Escalated By:</span> {e.escalated_by}</span>}
                      {e.email_subject && <span className="sm:col-span-2"><span className="font-medium">Email:</span> {e.email_subject}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showEscalForm ? (
          <div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">New Escalation</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date of Escalation</p>
                <input type="date" value={escalForm.date_of_escalation}
                  onChange={e => {
                    const val = e.target.value;
                    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                    const month = val ? MONTHS[new Date(val + 'T00:00:00').getMonth()] : '';
                    setEscalForm(f => ({ ...f, date_of_escalation: val, month }));
                  }} className="!py-1.5 text-sm" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Month</p>
                <select value={escalForm.month} onChange={e => setEscalForm(f => ({ ...f, month: e.target.value }))} className="!py-1.5 text-sm">
                  <option value="">—</option>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</p>
                <select value={escalForm.status} onChange={e => setEscalForm(f => ({ ...f, status: e.target.value }))} className="!py-1.5 text-sm">
                  <option>Open</option><option>In Progress</option><option>Partly Resolved</option><option>Resolved</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description *</p>
                <textarea rows={3} value={escalForm.description}
                  onChange={e => setEscalForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the escalation issue..." className="text-sm" />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Action Taken</p>
                <textarea rows={3} value={escalForm.action_taken}
                  onChange={e => setEscalForm(f => ({ ...f, action_taken: e.target.value }))}
                  placeholder="What steps were taken to resolve this..." className="text-sm" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ownership</p>
                <select value={escalForm.ownership} onChange={e => setEscalForm(f => ({ ...f, ownership: e.target.value }))} className="!py-1.5 text-sm">
                  <option value="">—</option>
                  {OWNERSHIP_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">ETA</p>
                <input type="date" value={escalForm.eta}
                  onChange={e => setEscalForm(f => ({ ...f, eta: e.target.value }))}
                  className="!py-1.5 text-sm" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Escalated By</p>
                <select value={escalForm.escalated_by} onChange={e => setEscalForm(f => ({ ...f, escalated_by: e.target.value }))} className="!py-1.5 text-sm">
                  <option value="">—</option>
                  {ESCALATED_BY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">PS Leader</p>
                <select value={escalForm.ps_leader} onChange={e => setEscalForm(f => ({ ...f, ps_leader: e.target.value }))} className="!py-1.5 text-sm">
                  <option value="">—</option>
                  {PS_LEADER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">CSM</p>
                {csms.length ? (
                  <select value={escalForm.csm} onChange={e => setEscalForm(f => ({ ...f, csm: e.target.value }))} className="!py-1.5 text-sm">
                    <option value="">—</option>
                    {csms.map(c => <option key={c}>{c}</option>)}
                  </select>
                ) : (
                  <input type="text" value={escalForm.csm}
                    onChange={e => setEscalForm(f => ({ ...f, csm: e.target.value }))}
                    placeholder="CSM name" className="!py-1.5 text-sm" />
                )}
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email Subject</p>
                <input type="text" value={escalForm.email_subject}
                  onChange={e => setEscalForm(f => ({ ...f, email_subject: e.target.value }))}
                  placeholder="Email subject line (if any)" className="!py-1.5 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSaveEscalation} disabled={escalSaving || !escalForm.description}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {escalSaving ? 'Saving…' : 'Save Escalation'}
              </button>
              <button onClick={() => { setShowEscalForm(false); setEscalForm(EMPTY_ESCAL); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowEscalForm(true)}
            className="text-sm text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Escalation
          </button>
        )}
      </Section>
    </div>
  );
}
