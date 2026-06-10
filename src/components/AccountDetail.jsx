import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

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
  try { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
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
  const [account,     setAccount]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [escalations, setEscalations] = useState([]);
  const [escalExpanded, setEscalExpanded] = useState(null);
  const [showAllEscal, setShowAllEscal] = useState(false);

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
  }, [id]);

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
          </div>
        </div>
        <Link
          to={`/accounts/${id}/edit`}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Edit Account
        </Link>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="MRR" value={fmt(a.mrr)} sub={a.mrr_tier} />
        <MetricCard label="Renewal" value={fmtDate(a.renewal_date)} sub={a.renewal_status} colorClass={a.renewal_status === 'Renewed' ? 'text-green-700' : 'text-gray-900'} />
        <MetricCard label="RAG" value={a.rag_status || '—'} colorClass={a.rag_status === 'Green' ? 'text-green-700' : a.rag_status === 'Red' ? 'text-red-700' : a.rag_status === 'Amber' ? 'text-amber-700' : 'text-gray-400'} />
        <MetricCard label="Escalations" value={activeEscal > 0 ? `${activeEscal} active` : escalations.length > 0 ? `${escalations.length} total` : '—'} sub={openEscal > 0 ? `${openEscal} open` : 'all resolved'} colorClass={openEscal > 0 ? 'text-red-600' : activeEscal > 0 ? 'text-amber-600' : 'text-gray-400'} />
        <MetricCard label="Adoption" value={a.adoption_score != null ? `${a.adoption_score}` : '—'} sub="score" />
        <MetricCard label="NPS" value={a.nps != null ? `${a.nps}` : '—'} />
      </div>

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
                <Link to="/escalations" className="text-xs text-brand-600 hover:underline font-medium">All escalations →</Link>
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

        {/* Right — Ring Fence + Team */}
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
    </div>
  );
}
