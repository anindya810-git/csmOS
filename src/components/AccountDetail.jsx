import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import LastEdited from './LastEdited';
import AiPanel from './AiPanel';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function toMonth(dateStr) {
  if (!dateStr) return '';
  try { const d = new Date(dateStr); return isNaN(d) ? '' : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
  catch { return ''; }
}

const RAG_COLOR = { Green: 'bg-green-100 text-green-800 border-green-200', Amber: 'bg-amber-100 text-amber-800 border-amber-200', Red: 'bg-red-100 text-red-800 border-red-200' };
const CHURN_COLOR = { 'Churn Activated': 'bg-red-100 text-red-700 border-red-200', 'Churn Predicted': 'bg-orange-100 text-orange-700 border-orange-200', 'Churn Executed': 'bg-gray-100 text-gray-600 border-gray-200', 'Contraction Predicted': 'bg-yellow-100 text-yellow-700 border-yellow-200' };
const ESC_COLOR = { Open: 'bg-red-100 text-red-700', 'In Progress': 'bg-amber-100 text-amber-700', 'Partly Resolved': 'bg-blue-100 text-blue-700', Resolved: 'bg-green-100 text-green-700' };
const STATUS_STYLES = { Resolved: 'bg-green-100 text-green-800', 'In Progress': 'bg-amber-100 text-amber-800', 'Partly Resolved': 'bg-blue-100 text-blue-800', Open: 'bg-red-100 text-red-800' };

function fmt(n) {
  if (!n) return '—';
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(1)}L`;
  return `₹${n.toLocaleString()}`;
}

function fmtDate(s) {
  if (!s) return '—';
  try {
    let d = new Date(s);
    // Fallback: try DD/MM/YYYY
    if (isNaN(d.getTime()) && /^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split('/');
      d = new Date(`${yyyy}-${mm}-${dd}`);
    }
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return s; }
}

function MetricCard({ label, value, sub, colorClass }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 min-w-0">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-0.5 truncate ${colorClass || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function CheckItem({ label, value, date }) {
  const yes = value?.toLowerCase() === 'yes';
  const no  = value?.toLowerCase() === 'no';
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className={`mt-0.5 shrink-0 w-4.5 h-4.5 rounded-full flex items-center justify-center text-xs font-bold ${yes ? 'text-green-600' : no ? 'text-gray-300' : 'text-gray-200'}`}>
        {yes ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth={1.5} /></svg>
        )}
      </div>
      <div className="min-w-0">
        <span className={`text-sm ${yes ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
        {date && <span className="ml-1 text-xs text-gray-400">({fmtDate(date)})</span>}
      </div>
    </div>
  );
}

function PocCard({ n, account }) {
  const name  = account[`poc${n}_name`];
  const email = account[`poc${n}_email`];
  const phone = account[`poc${n}_phone`];
  const desig = account[`poc${n}_designation`];
  if (!name && !email) return null;
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
          {(name || '?')[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
          {desig && <p className="text-xs text-gray-400 truncate">{desig}</p>}
        </div>
      </div>
      {email && <a href={`mailto:${email}`} className="text-xs text-brand-600 hover:underline block truncate">{email}</a>}
      {phone && <p className="text-xs text-gray-500 mt-0.5">{phone}</p>}
    </div>
  );
}

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [account,     setAccount]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [escalations,   setEscalations]   = useState([]);
  const [escalExpanded, setEscalExpanded] = useState(null);
  const [showAllEscal,  setShowAllEscal]  = useState(false);
  const [issues,        setIssues]        = useState([]);
  const [issueExpanded, setIssueExpanded] = useState(null);
  const [showAllIssues, setShowAllIssues] = useState(false);

  // Add escalation modal
  const [showAddEscal,  setShowAddEscal]  = useState(false);
  const [escalForm,     setEscalForm]     = useState({});
  const [escalSaving,   setEscalSaving]   = useState(false);
  const [escalError,    setEscalError]    = useState(null);

  // Add issue modal
  const [showAddIssue,  setShowAddIssue]  = useState(false);
  const [issueForm,     setIssueForm]     = useState({});
  const [issueSaving,   setIssueSaving]   = useState(false);
  const [issueError,    setIssueError]    = useState(null);

  // Tasks
  const [tasks,         setTasks]         = useState([]);
  const [taskExpanded,  setTaskExpanded]  = useState(null);
  const [showAllTasks,  setShowAllTasks]  = useState(false);
  const [showAddTask,   setShowAddTask]   = useState(false);
  const [taskForm,      setTaskForm]      = useState({});
  const [taskSaving,    setTaskSaving]    = useState(false);
  const [taskError,     setTaskError]     = useState(null);

  // Dropdown options
  const [ddConfig,      setDdConfig]      = useState({});
  const [csms,          setCsms]          = useState([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios.get(`/api/accounts/${id}`)
      .then(r => {
        const d = r.data;
        if (!d || typeof d !== 'object' || Array.isArray(d)) { setError('Unexpected response'); return; }
        setAccount(d);
      })
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
    axios.get(`/api/escalations?account_id=${id}`)
      .then(r => setEscalations(r.data || []))
      .catch(() => {});
    axios.get(`/api/issues?account_id=${id}`)
      .then(r => setIssues(r.data || []))
      .catch(() => {});
    axios.get('/api/dropdown-config').then(r => setDdConfig(r.data || {})).catch(() => {});
    axios.get('/api/accounts/filters').then(r => setCsms(r.data.csms || [])).catch(() => {});
    axios.get(`/api/tasks?account_id=${id}`)
      .then(r => setTasks(r.data || []))
      .catch(() => {});
  }, [id]);

  function openAddEscal() {
    const today = new Date().toISOString().split('T')[0];
    setEscalForm({ description: '', date_of_escalation: today, status: 'Open', csm: account?.csm || '', ownership: '', eta: '', escalated_by: '', trigger_reason: '', source_of_escalation: '' });
    setEscalError(null);
    setShowAddEscal(true);
  }

  function openAddIssue() {
    const today = new Date().toISOString().split('T')[0];
    setIssueForm({ description: '', reported_date: today, priority: '', status: 'Open', csm: account?.csm || '', csm_lead: account?.csm_lead || '', issue_type: '', issue_sub_type: '', owner_team: '', support_ticket: '', dev_ticket: '', next_steps: '' });
    setIssueError(null);
    setShowAddIssue(true);
  }

  async function handleAddEscal(e) {
    e.preventDefault();
    if (!escalForm.description?.trim()) { setEscalError('Description is required'); return; }
    setEscalSaving(true); setEscalError(null);
    try {
      const { data } = await axios.post('/api/escalations', {
        account_id: Number(id),
        account_name: account?.account_name,
        tenant_id: account?.tenant_id,
        month: toMonth(escalForm.date_of_escalation),
        ...escalForm,
      });
      setEscalations(prev => [data, ...prev]);
      setShowAddEscal(false);
    } catch (err) {
      setEscalError(err.response?.data?.error || 'Failed to save');
    } finally {
      setEscalSaving(false);
    }
  }

  async function handleAddIssue(e) {
    e.preventDefault();
    if (!issueForm.description?.trim()) { setIssueError('Description is required'); return; }
    setIssueSaving(true); setIssueError(null);
    try {
      const { data } = await axios.post('/api/issues', {
        account_id: Number(id),
        account_name: account?.account_name,
        tenant_id: account?.tenant_id,
        ...issueForm,
      });
      setIssues(prev => [data, ...prev]);
      setShowAddIssue(false);
    } catch (err) {
      setIssueError(err.response?.data?.error || 'Failed to save');
    } finally {
      setIssueSaving(false);
    }
  }

  function openAddTask() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dt = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setTaskForm({ task_subject: '', nature_of_task: '', task_description: '', due_date: dt, assigned_to: account?.csm || '' });
    setTaskError(null);
    setShowAddTask(true);
  }

  async function handleAddTask(e) {
    e.preventDefault();
    if (!taskForm.task_subject?.trim()) { setTaskError('Task subject is required'); return; }
    if (!taskForm.due_date) { setTaskError('Due date is required'); return; }
    setTaskSaving(true); setTaskError(null);
    try {
      const { data } = await axios.post('/api/tasks', {
        task_subject: taskForm.task_subject.trim(),
        task_description: taskForm.task_description || null,
        nature_of_task: taskForm.nature_of_task || null,
        due_date: new Date(taskForm.due_date).toISOString(),
        account_id: Number(id),
        account_name: account?.account_name,
        assigned_to: taskForm.assigned_to || null,
      });
      setTasks(prev => [data, ...prev]);
      setShowAddTask(false);
    } catch (err) {
      setTaskError(err.response?.data?.error || 'Failed to save');
    } finally {
      setTaskSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error)   return <div className="max-w-lg mx-auto mt-16 p-6 bg-red-50 rounded-xl border border-red-200 text-center space-y-3"><p className="text-red-700">{error}</p><button onClick={() => navigate('/accounts')} className="text-sm text-brand-600 hover:underline">← Back</button></div>;
  if (!account) return null;

  const a = account;
  const rfItems = [
    { label: 'Account Understanding Session', field: 'account_understanding_session' },
    { label: 'New CSM Intro with Client',     field: 'new_csm_intro_done' },
    { label: 'CSM Escalation Matrix Shared',  field: 'csm_escalation_matrix_shared' },
    { label: 'Ring Fence Meeting Initiated',  field: 'ring_fence_meeting_initiated' },
    { label: 'Meeting Done',                  field: 'meeting_done', date: a.meeting_planned_date },
    { label: 'Issue Mapping Sheet Updated',   field: 'issue_mapping_sheet_updated' },
    { label: 'Review Cadence Alignment',      field: 'review_cadence_alignment' },
  ];
  const rfDone  = rfItems.filter(i => a[i.field]?.toLowerCase() === 'yes').length;
  const rfTotal = rfItems.length;
  const rfPct   = Math.round((rfDone / rfTotal) * 100);

  const openEscal    = escalations.filter(e => e.status === 'Open').length;
  const activeEscal  = escalations.filter(e => e.status !== 'Resolved').length;
  const viewEscal    = showAllEscal ? escalations : escalations.slice(0, 3);
  const viewPocs     = [1,2,3].filter(n => a[`poc${n}_name`] || a[`poc${n}_email`]);

  const openIssues   = issues.filter(i => i.status === 'Open').length;
  const activeIssues = issues.filter(i => i.status !== 'Resolved').length;
  const viewIssues   = showAllIssues ? issues : issues.slice(0, 3);
  const viewTasks    = showAllTasks ? tasks : tasks.slice(0, 3);
  const topThemes    = Object.entries(
    issues.reduce((acc, i) => { if (i.issue_type) { acc[i.issue_type] = (acc[i.issue_type] || 0) + 1; } return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/accounts')} className="mt-1 text-gray-400 hover:text-gray-600 transition shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{a.account_name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {a.tenant_id && <span className="text-xs bg-gray-100 text-gray-600 font-mono px-2 py-0.5 rounded">{a.tenant_id}</span>}
              {a.industry && <span className="text-xs text-gray-500">{a.industry}</span>}
              {a.region && <span className="text-xs text-gray-400">· {a.region}</span>}
              {a.rag_status && <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${RAG_COLOR[a.rag_status] || 'bg-gray-100 text-gray-600'}`}>{a.rag_status}</span>}
              {a.churn_status && <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${CHURN_COLOR[a.churn_status] || 'bg-gray-100 text-gray-600'}`}>{a.churn_status}</span>}
            </div>
            <LastEdited by={a.updated_by} at={a.updated_at} className="mt-1.5" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            to={`/accounts/${id}/timeline`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Timeline
          </Link>
          <Link
            to={`/accounts/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit
          </Link>
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <MetricCard label="MRR" value={fmt(a.mrr)} sub={a.mrr_tier} />
        <MetricCard label="Renewal" value={fmtDate(a.renewal_date)} sub={a.renewal_status} colorClass={a.renewal_status === 'Renewed' ? 'text-green-700' : 'text-gray-900'} />
        <MetricCard label="RAG" value={a.rag_status || '—'} colorClass={a.rag_status === 'Green' ? 'text-green-700' : a.rag_status === 'Red' ? 'text-red-700' : a.rag_status === 'Amber' ? 'text-amber-700' : 'text-gray-400'} />
        <MetricCard label="Escalations" value={activeEscal > 0 ? `${activeEscal} active` : escalations.length > 0 ? `${escalations.length} total` : '—'} sub={openEscal > 0 ? `${openEscal} open` : activeEscal === 0 && escalations.length > 0 ? 'all resolved' : undefined} colorClass={openEscal > 0 ? 'text-red-600' : activeEscal > 0 ? 'text-amber-600' : 'text-gray-400'} />
        <MetricCard label="Issues" value={activeIssues > 0 ? `${activeIssues} active` : issues.length > 0 ? `${issues.length} total` : '—'} sub={openIssues > 0 ? `${openIssues} open` : activeIssues === 0 && issues.length > 0 ? 'all resolved' : undefined} colorClass={openIssues > 0 ? 'text-red-600' : activeIssues > 0 ? 'text-amber-600' : 'text-gray-400'} />
        <MetricCard label="Adoption" value={a.adoption_score != null ? `${a.adoption_score}` : '—'} sub="score" />
        <MetricCard label="NPS" value={a.nps != null ? `${a.nps}` : '—'} />
      </div>

      {/* AI account summary (manual refresh, ≤200 words) */}
      <AiPanel
        section="account_summary"
        title="AI Account Summary"
        getPayload={() => ({ account_id: id })}
        initialText={a.ai_summary}
        initialAt={a.ai_summary_at}
        onGenerated={(t, at) => setAccount(prev => ({ ...prev, ai_summary: t, ai_summary_at: at }))}
        hint="Summarizes this account across escalations, issues, tasks, health and commercials. Click Generate."
      />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — Escalations + POCs */}
        <div className="lg:col-span-2 space-y-5">

          {/* Escalations */}
          <div className="card">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">
                Escalations
                {escalations.length > 0 && <span className="ml-2 text-xs font-normal text-gray-400">{escalations.length} total</span>}
              </h3>
              <div className="flex items-center gap-2">
                {escalations.length === 0 && <span className="text-xs text-gray-400">None recorded</span>}
                <button onClick={openAddEscal} className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-0.5 transition">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add
                </button>
                <Link to="/escalations" className="text-xs text-gray-400 hover:underline font-medium">All →</Link>
              </div>
            </div>

            {escalations.length > 0 ? (
              <>
                {/* Status summary chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(['Open','In Progress','Partly Resolved','Resolved']).map(s => {
                    const cnt = escalations.filter(e => e.status === s).length;
                    if (!cnt) return null;
                    return <span key={s} className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESC_COLOR[s]}`}>{cnt} {s}</span>;
                  })}
                </div>
                <div className="space-y-2">
                  {viewEscal.map(e => (
                    <div key={e.id} className="rounded-lg border border-gray-100 overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition text-left"
                        onClick={() => setEscalExpanded(escalExpanded === e.id ? null : e.id)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`shrink-0 inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[e.status] || 'bg-gray-100 text-gray-700'}`}>{e.status}</span>
                          <span className="text-sm text-gray-700 truncate">{e.description?.substring(0, 70)}{e.description?.length > 70 ? '…' : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(e.date_of_escalation)}</span>
                          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${escalExpanded === e.id ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </button>
                      {escalExpanded === e.id && (
                        <div className="px-3 pb-3 pt-1 bg-gray-50 border-t border-gray-100 space-y-2 text-sm">
                          <p className="text-gray-700 whitespace-pre-wrap">{e.description}</p>
                          {e.action_taken && <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Action Taken</p><p className="text-gray-700 whitespace-pre-wrap">{e.action_taken}</p></div>}
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
                            {e.ownership && <span><span className="font-medium">Ownership:</span> {e.ownership}</span>}
                            {e.csm && <span><span className="font-medium">CSM:</span> {e.csm}</span>}
                            {e.eta && <span><span className="font-medium">ETA:</span> {fmtDate(e.eta)}</span>}
                            {e.escalated_by && <span><span className="font-medium">Escalated by:</span> {e.escalated_by}</span>}
                            {e.ps_leader && <span><span className="font-medium">PS Leader:</span> {e.ps_leader}</span>}
                          </div>
                          <div className="pt-2 border-t border-gray-100">
                            <AiPanel
                              section="escalation_next_steps"
                              title="AI Recommended Next Steps"
                              compact
                              getPayload={() => ({ kind: 'escalation', item: e })}
                              initialText={e.ai_next_steps}
                              initialAt={e.ai_next_steps_at}
                              onGenerated={(t, at) => setEscalations(prev => prev.map(x => x.id === e.id ? { ...x, ai_next_steps: t, ai_next_steps_at: at } : x))}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {escalations.length > 3 && (
                  <button onClick={() => setShowAllEscal(s => !s)} className="mt-3 text-xs text-brand-600 hover:underline font-medium">
                    {showAllEscal ? 'Show less' : `Show all ${escalations.length} escalations`}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 italic">No escalations recorded.</p>
            )}
          </div>

          {/* AI summary of this account's escalations */}
          <AiPanel
            section="account_escalations"
            title="AI Escalations Summary"
            getPayload={() => ({ account_id: id })}
            initialText={a.ai_escalations_summary}
            initialAt={a.ai_escalations_summary_at}
            onGenerated={(t, at) => setAccount(prev => ({ ...prev, ai_escalations_summary: t, ai_escalations_summary_at: at }))}
            hint="Summarizes this account's escalations. Click Generate."
          />

          {/* Issues */}
          <div className="card">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">
                Issues
                {issues.length > 0 && <span className="ml-2 text-xs font-normal text-gray-400">{issues.length} total</span>}
              </h3>
              <div className="flex items-center gap-2">
                {issues.length === 0 && <span className="text-xs text-gray-400">None recorded</span>}
                <button onClick={openAddIssue} className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-0.5 transition">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add
                </button>
                <Link to="/issues" className="text-xs text-gray-400 hover:underline font-medium">All →</Link>
              </div>
            </div>

            {issues.length > 0 ? (
              <>
                {/* Status summary chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(['Open','In Progress','Resolved']).map(s => {
                    const cnt = issues.filter(i => i.status === s).length;
                    if (!cnt) return null;
                    return <span key={s} className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[s] || 'bg-gray-100 text-gray-700'}`}>{cnt} {s}</span>;
                  })}
                </div>

                {/* Top themes */}
                {topThemes.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top Themes</p>
                    <div className="space-y-1.5">
                      {topThemes.map(([type, count]) => (
                        <div key={type} className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-brand-500 h-full rounded-full" style={{ width: `${Math.round((count / issues.length) * 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-600 whitespace-nowrap min-w-0 truncate max-w-[140px]">{type}</span>
                          <span className="text-xs font-semibold text-gray-700 shrink-0">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {viewIssues.map(issue => (
                    <div key={issue.id} className="rounded-lg border border-gray-100 overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition text-left"
                        onClick={() => setIssueExpanded(issueExpanded === issue.id ? null : issue.id)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`shrink-0 inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[issue.status] || 'bg-gray-100 text-gray-700'}`}>{issue.status}</span>
                          {issue.priority && <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded border ${issue.priority === 'High' ? 'bg-red-50 text-red-600 border-red-200' : issue.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{issue.priority}</span>}
                          <span className="text-sm text-gray-700 truncate">{issue.description?.substring(0, 70)}{issue.description?.length > 70 ? '…' : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(issue.reported_date)}</span>
                          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${issueExpanded === issue.id ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </button>
                      {issueExpanded === issue.id && (
                        <div className="px-3 pb-3 pt-1 bg-gray-50 border-t border-gray-100 space-y-2 text-sm">
                          <p className="text-gray-700 whitespace-pre-wrap">{issue.description}</p>
                          {issue.next_steps && <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Next Steps</p><p className="text-gray-700 whitespace-pre-wrap">{issue.next_steps}</p></div>}
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
                            {issue.issue_type && <span><span className="font-medium">Type:</span> {issue.issue_type}</span>}
                            {issue.issue_sub_type && <span><span className="font-medium">Sub-type:</span> {issue.issue_sub_type}</span>}
                            {issue.owner_team && <span><span className="font-medium">Owner:</span> {issue.owner_team}</span>}
                            {issue.csm && <span><span className="font-medium">CSM:</span> {issue.csm}</span>}
                            {issue.closure_date && <span><span className="font-medium">Closure:</span> {issue.closure_date}</span>}
                          </div>
                          {(issue.support_ticket || issue.dev_ticket) && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {issue.support_ticket && (
                                <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-mono">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                                  Support #{issue.support_ticket}
                                </span>
                              )}
                              {issue.dev_ticket && (
                                <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-mono">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                  Dev #{issue.dev_ticket}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="pt-2 border-t border-gray-100">
                            <AiPanel
                              section="issue_next_steps"
                              title="AI Recommended Next Steps"
                              compact
                              getPayload={() => ({ kind: 'issue', item: issue })}
                              initialText={issue.ai_next_steps}
                              initialAt={issue.ai_next_steps_at}
                              onGenerated={(t, at) => setIssues(prev => prev.map(x => x.id === issue.id ? { ...x, ai_next_steps: t, ai_next_steps_at: at } : x))}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {issues.length > 3 && (
                  <button onClick={() => setShowAllIssues(s => !s)} className="mt-3 text-xs text-brand-600 hover:underline font-medium">
                    {showAllIssues ? 'Show less' : `Show all ${issues.length} issues`}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 italic">No issues recorded.</p>
            )}
          </div>

          {/* AI summary of this account's issues */}
          <AiPanel
            section="account_issues"
            title="AI Issues Summary"
            getPayload={() => ({ account_id: id })}
            initialText={a.ai_issues_summary}
            initialAt={a.ai_issues_summary_at}
            onGenerated={(t, at) => setAccount(prev => ({ ...prev, ai_issues_summary: t, ai_issues_summary_at: at }))}
            hint="Summarizes this account's issues. Click Generate."
          />

          {/* Tasks */}
          <div className="card">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">
                Tasks
                {tasks.length > 0 && <span className="ml-2 text-xs font-normal text-gray-400">{tasks.length} total</span>}
              </h3>
              <div className="flex items-center gap-2">
                {tasks.length === 0 && <span className="text-xs text-gray-400">None recorded</span>}
                <button onClick={openAddTask} className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-0.5 transition">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add
                </button>
                <Link to="/tasks" className="text-xs text-gray-400 hover:underline font-medium">All →</Link>
              </div>
            </div>
            {tasks.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(['Open','Overdue','Completed']).map(s => {
                    const cnt = tasks.filter(t => t.derived_status === s).length;
                    if (!cnt) return null;
                    const color = s === 'Open' ? 'bg-blue-100 text-blue-700' : s === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
                    return <span key={s} className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{cnt} {s}</span>;
                  })}
                </div>
                <div className="space-y-2">
                  {viewTasks.map(task => (
                    <div key={task.id} className={`rounded-lg border overflow-hidden ${task.derived_status === 'Overdue' ? 'border-red-100' : 'border-gray-100'}`}>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition text-left"
                        onClick={() => setTaskExpanded(taskExpanded === task.id ? null : task.id)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`shrink-0 inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${
                            task.derived_status === 'Open' ? 'bg-blue-100 text-blue-700'
                            : task.derived_status === 'Overdue' ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                          }`}>{task.derived_status}</span>
                          {task.nature_of_task && <span className="shrink-0 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{task.nature_of_task}</span>}
                          <span className="text-sm text-gray-700 truncate">{task.task_subject}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(task.due_date)}</span>
                          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${taskExpanded === task.id ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </button>
                      {taskExpanded === task.id && (
                        <div className="px-3 pb-3 pt-1 bg-gray-50 border-t border-gray-100 space-y-2 text-sm">
                          {task.task_description && <p className="text-gray-700 whitespace-pre-wrap">{task.task_description}</p>}
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
                            {task.assigned_to && <span><span className="font-medium">Assigned to:</span> {task.assigned_to}</span>}
                            {task.assigned_by && <span><span className="font-medium">Assigned by:</span> {task.assigned_by}</span>}
                            {task.due_date && <span><span className="font-medium">Due:</span> {fmtDate(task.due_date)}</span>}
                            {task.completed_at && <span><span className="font-medium">Completed:</span> {fmtDate(task.completed_at)}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {tasks.length > 3 && (
                  <button onClick={() => setShowAllTasks(s => !s)} className="mt-3 text-xs text-brand-600 hover:underline font-medium">
                    {showAllTasks ? 'Show less' : `Show all ${tasks.length} tasks`}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 italic">No tasks recorded.</p>
            )}
          </div>

          {/* Points of Contact */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100 mb-4">Points of Contact</h3>
            {viewPocs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {viewPocs.map(n => <PocCard key={n} n={n} account={a} />)}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No contacts on file. <Link to={`/accounts/${id}/edit`} className="text-brand-600 hover:underline">Add via Edit →</Link></p>
            )}
          </div>

          {/* Account info summary */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100 mb-4">Account Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              {[
                ['CSM Lead',           a.csm_lead],
                ['CSM',                a.csm],
                ['CP',                 a.cp],
                ['Billing',            a.billing_frequency],
                ['TAM Assigned',       a.tam_assigned],
                ['Implementation',     a.implementation_status],
                ['PS Engagement',      a.ps_engagement],
                ['Go-live Date',       fmtDate(a.golive_date)],
                ['Closure ETA',        fmtDate(a.closure_eta)],
                ['GRR (%)',            a.grr != null ? `${a.grr}%` : null],
                ['Stickiness Score',   a.stickiness_score != null ? `${a.stickiness_score}` : null],
                ['Adoption Rate',      a.adoption_rate != null ? `${a.adoption_rate}%` : null],
              ].map(([lbl, val]) => val ? (
                <div key={lbl}>
                  <p className="text-xs text-gray-400 font-medium">{lbl}</p>
                  <p className="text-gray-800">{val}</p>
                </div>
              ) : null)}
            </div>
            {a.rag_reason && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-medium mb-1">RAG Reason</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.rag_reason}</p>
              </div>
            )}
            {a.actions_taken && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 font-medium mb-1">Actions Taken</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.actions_taken}</p>
              </div>
            )}
            {a.churn_reason && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 font-medium mb-1">Churn Reason</p>
                <p className="text-sm text-gray-700">{a.churn_reason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right — Ring Fence + Renewal */}
        <div className="space-y-5">

          {/* Ring Fence Status */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100 mb-3">Ring Fence Status</h3>
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500">{rfDone} of {rfTotal} complete</span>
                <span className={`text-xs font-bold ${rfPct === 100 ? 'text-green-600' : rfPct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{rfPct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${rfPct === 100 ? 'bg-green-500' : rfPct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${rfPct}%` }}
                />
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {rfItems.map(item => (
                <CheckItem key={item.field} label={item.label} value={a[item.field]} date={item.date} />
              ))}
            </div>
            {a.meeting_planned_date && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-medium">Meeting Planned Date</p>
                <p className="text-sm text-gray-700 mt-0.5">{fmtDate(a.meeting_planned_date)}</p>
              </div>
            )}
          </div>

          {/* Churn & Risk */}
          {(a.churn_status || a.renewal_status || a.renewal_comments) && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100 mb-3">Renewal & Risk</h3>
              <div className="space-y-2.5 text-sm">
                {a.churn_status && <div><p className="text-xs text-gray-400">Churn Status</p><span className={`inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full border ${CHURN_COLOR[a.churn_status] || 'bg-gray-100 text-gray-600'}`}>{a.churn_status}</span></div>}
                {a.renewal_status && <div><p className="text-xs text-gray-400">Renewal Status</p><p className="text-gray-800">{a.renewal_status}</p></div>}
                {a.grr != null && <div><p className="text-xs text-gray-400">GRR</p><p className="text-gray-800 font-medium">{a.grr}%</p></div>}
                {a.nps != null && <div><p className="text-xs text-gray-400">NPS</p><p className="text-gray-800 font-medium">{a.nps}</p></div>}
                {a.churn_reason && <div><p className="text-xs text-gray-400">Churn Reason</p><p className="text-gray-700">{a.churn_reason}</p></div>}
                {a.renewal_comments && <div><p className="text-xs text-gray-400">Comments</p><p className="text-gray-700 whitespace-pre-wrap">{a.renewal_comments}</p></div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Escalation Modal ─────────────────────────────────────── */}
      {showAddEscal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-12 overflow-y-auto" onClick={() => setShowAddEscal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Add Escalation</h3>
                <p className="text-xs text-gray-400 mt-0.5">{a.account_name}</p>
              </div>
              <button onClick={() => setShowAddEscal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddEscal} className="p-5 space-y-3">
              {escalError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{escalError}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description *</label>
                <textarea rows={3} value={escalForm.description}
                  onChange={e => setEscalForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the escalation…" className="resize-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                  <input type="date" value={escalForm.date_of_escalation}
                    onChange={e => setEscalForm(f => ({ ...f, date_of_escalation: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select value={escalForm.status} onChange={e => setEscalForm(f => ({ ...f, status: e.target.value }))}>
                    {['Open','In Progress','Partly Resolved','Resolved'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">CSM</label>
                  <select value={escalForm.csm} onChange={e => setEscalForm(f => ({ ...f, csm: e.target.value }))}>
                    <option value="">—</option>
                    {csms.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ownership</label>
                  <input value={escalForm.ownership} onChange={e => setEscalForm(f => ({ ...f, ownership: e.target.value }))} placeholder="e.g. Product" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">ETA</label>
                  <input type="date" value={escalForm.eta} onChange={e => setEscalForm(f => ({ ...f, eta: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Escalated By</label>
                  <input value={escalForm.escalated_by} onChange={e => setEscalForm(f => ({ ...f, escalated_by: e.target.value }))} placeholder="Name" />
                </div>
                {[...new Set((ddConfig.trigger_reason || []).map(o => o.value))].length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Trigger Reason</label>
                    <select value={escalForm.trigger_reason} onChange={e => setEscalForm(f => ({ ...f, trigger_reason: e.target.value }))}>
                      <option value="">—</option>
                      {[...new Set((ddConfig.trigger_reason || []).map(o => o.value))].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                )}
                {[...new Set((ddConfig.source_of_escalation || []).map(o => o.value))].length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
                    <select value={escalForm.source_of_escalation} onChange={e => setEscalForm(f => ({ ...f, source_of_escalation: e.target.value }))}>
                      <option value="">—</option>
                      {[...new Set((ddConfig.source_of_escalation || []).map(o => o.value))].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddEscal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                <button type="submit" disabled={escalSaving}
                  className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition disabled:opacity-50">
                  {escalSaving ? 'Saving…' : 'Add Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Issue Modal ──────────────────────────────────────────── */}
      {showAddIssue && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-12 overflow-y-auto" onClick={() => setShowAddIssue(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Add Issue</h3>
                <p className="text-xs text-gray-400 mt-0.5">{a.account_name}</p>
              </div>
              <button onClick={() => setShowAddIssue(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddIssue} className="p-5 space-y-3">
              {issueError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{issueError}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description *</label>
                <textarea rows={3} value={issueForm.description}
                  onChange={e => setIssueForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the issue…" className="resize-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Reported Date</label>
                  <input type="date" value={issueForm.reported_date}
                    onChange={e => setIssueForm(f => ({ ...f, reported_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                  <select value={issueForm.priority} onChange={e => setIssueForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="">—</option>
                    {['High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select value={issueForm.status} onChange={e => setIssueForm(f => ({ ...f, status: e.target.value }))}>
                    {['Open','In Progress','Deferred','Resolved','Closed'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">CSM</label>
                  <select value={issueForm.csm} onChange={e => setIssueForm(f => ({ ...f, csm: e.target.value }))}>
                    <option value="">—</option>
                    {csms.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                {[...new Set((ddConfig.issue_type || []).map(o => o.value))].length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Issue Type</label>
                    <select value={issueForm.issue_type}
                      onChange={e => setIssueForm(f => ({ ...f, issue_type: e.target.value, issue_sub_type: '' }))}>
                      <option value="">—</option>
                      {[...new Set((ddConfig.issue_type || []).map(o => o.value))].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                )}
                {issueForm.issue_type && (ddConfig.issue_sub_type || []).filter(o => o.parent_value === issueForm.issue_type).length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sub-type</label>
                    <select value={issueForm.issue_sub_type} onChange={e => setIssueForm(f => ({ ...f, issue_sub_type: e.target.value }))}>
                      <option value="">—</option>
                      {(ddConfig.issue_sub_type || []).filter(o => o.parent_value === issueForm.issue_type).map(o => <option key={o.value}>{o.value}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Owner Team</label>
                  <input value={issueForm.owner_team} onChange={e => setIssueForm(f => ({ ...f, owner_team: e.target.value }))} placeholder="e.g. Engineering" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Support Ticket #</label>
                  <input value={issueForm.support_ticket} onChange={e => setIssueForm(f => ({ ...f, support_ticket: e.target.value }))} placeholder="12345" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Dev Ticket #</label>
                  <input value={issueForm.dev_ticket} onChange={e => setIssueForm(f => ({ ...f, dev_ticket: e.target.value }))} placeholder="JIRA-123" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Next Steps</label>
                <textarea rows={2} value={issueForm.next_steps}
                  onChange={e => setIssueForm(f => ({ ...f, next_steps: e.target.value }))}
                  placeholder="Planned next steps…" className="resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddIssue(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                <button type="submit" disabled={issueSaving}
                  className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition disabled:opacity-50">
                  {issueSaving ? 'Saving…' : 'Add Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Task Modal ───────────────────────────────────────────── */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-12 overflow-y-auto" onClick={() => setShowAddTask(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Add Task</h3>
                <p className="text-xs text-gray-400 mt-0.5">{a.account_name}</p>
              </div>
              <button onClick={() => setShowAddTask(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddTask} className="p-5 space-y-3">
              {taskError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{taskError}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Task Subject *</label>
                <input value={taskForm.task_subject}
                  onChange={e => setTaskForm(f => ({ ...f, task_subject: e.target.value }))}
                  placeholder="What needs to be done?" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[...new Set((ddConfig.nature_of_task || []).map(o => o.value))].length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nature of Task</label>
                    <select value={taskForm.nature_of_task} onChange={e => setTaskForm(f => ({ ...f, nature_of_task: e.target.value }))}>
                      <option value="">—</option>
                      {[...new Set((ddConfig.nature_of_task || []).map(o => o.value))].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Due Date &amp; Time *</label>
                  <input type="datetime-local" value={taskForm.due_date}
                    onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} required />
                </div>
                {user?.role === 'admin' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Assign To</label>
                    <select value={taskForm.assigned_to} onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))}>
                      <option value="">—</option>
                      {csms.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea rows={2} value={taskForm.task_description}
                  onChange={e => setTaskForm(f => ({ ...f, task_description: e.target.value }))}
                  placeholder="Optional details…" className="resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                <button type="submit" disabled={taskSaving}
                  className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition disabled:opacity-50">
                  {taskSaving ? 'Saving…' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
