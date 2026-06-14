import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';

/* ─── Field catalog ──────────────────────────────────────────────── */

const FIELDS = {
  accounts: [
    { key: 'account_name',     label: 'Account Name' },
    { key: 'tenant_id',        label: 'Tenant ID' },
    { key: 'csm',              label: 'CSM' },
    { key: 'csm_lead',         label: 'CSM Lead' },
    { key: 'rag_status',       label: 'RAG Status',       options: ['Green','Amber','Red'] },
    { key: 'region',           label: 'Region' },
    { key: 'industry',         label: 'Industry' },
    { key: 'mrr',              label: 'MRR',              numeric: true },
    { key: 'mrr_tier',         label: 'MRR Tier' },
    { key: 'renewal_date',     label: 'Renewal Date' },
    { key: 'golive_date',      label: 'Go-Live Date' },
    { key: 'adoption_score',   label: 'Adoption Score',   numeric: true },
    { key: 'stickiness_score', label: 'Stickiness Score', numeric: true },
  ],
  issues: [
    { key: 'account_name',   label: 'Account Name' },
    { key: 'priority',       label: 'Priority',     options: ['P1','P2','P3'] },
    { key: 'issue_type',     label: 'Issue Type' },
    { key: 'issue_sub_type', label: 'Issue Sub Type' },
    { key: 'owner_team',     label: 'Owner Team' },
    { key: 'status',         label: 'Status',       options: ['Open','Closed'] },
    { key: 'reported_date',  label: 'Reported Date' },
    { key: 'closure_date',   label: 'Closure Date' },
    { key: 'csm',            label: 'CSM' },
    { key: 'csm_lead',       label: 'CSM Lead' },
    { key: 'description',    label: 'Description' },
  ],
  escalations: [
    { key: 'account_name',         label: 'Account Name' },
    { key: 'date_of_escalation',   label: 'Escalation Date' },
    { key: 'month',                label: 'Month' },
    { key: 'status',               label: 'Status',       options: ['Open','Closed'] },
    { key: 'csm',                  label: 'CSM' },
    { key: 'ownership',            label: 'Ownership' },
    { key: 'trigger_reason',       label: 'Trigger Reason' },
    { key: 'issue_type',           label: 'Issue Type' },
    { key: 'escalated_by',         label: 'Escalated By' },
    { key: 'source_of_escalation', label: 'Source' },
    { key: 'description',          label: 'Description' },
  ],
  tasks: [
    { key: 'task_subject',   label: 'Subject' },
    { key: 'nature_of_task', label: 'Nature of Task' },
    { key: 'account_name',   label: 'Account Name' },
    { key: 'assigned_to',    label: 'Assigned To' },
    { key: 'assigned_by',    label: 'Assigned By' },
    { key: 'due_date',       label: 'Due Date' },
    { key: 'status',         label: 'Status',       options: ['Open','Completed'] },
  ],
};

const ACCOUNT_JOIN_FIELDS = [
  { key: 'rag_status',       label: 'RAG Status',       options: ['Green','Amber','Red'] },
  { key: 'mrr',              label: 'MRR',              numeric: true },
  { key: 'mrr_tier',         label: 'MRR Tier' },
  { key: 'region',           label: 'Region' },
  { key: 'industry',         label: 'Industry' },
  { key: 'csm_lead',         label: 'CSM Lead' },
  { key: 'renewal_date',     label: 'Renewal Date' },
  { key: 'adoption_score',   label: 'Adoption Score',   numeric: true },
  { key: 'stickiness_score', label: 'Stickiness Score', numeric: true },
];

const COMPUTED_FIELDS = [
  { key: 'issues_count',           label: 'Total Issues',      numeric: true },
  { key: 'open_issues_count',      label: 'Open Issues',       numeric: true },
  { key: 'escalations_count',      label: 'Total Escalations', numeric: true },
  { key: 'open_escalations_count', label: 'Open Escalations',  numeric: true },
  { key: 'tasks_count',            label: 'Total Tasks',       numeric: true },
  { key: 'open_tasks_count',       label: 'Open Tasks',        numeric: true },
];

/* ─── Style tokens ───────────────────────────────────────────────── */

const EC = {
  accounts:          { bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-500',    ring: 'ring-blue-300'    },
  issues:            { bg: 'bg-rose-100',    text: 'text-rose-800',    dot: 'bg-rose-500',    ring: 'ring-rose-300'    },
  escalations:       { bg: 'bg-amber-100',   text: 'text-amber-800',   dot: 'bg-amber-500',   ring: 'ring-amber-300'   },
  tasks:             { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500', ring: 'ring-emerald-300' },
  accounts_computed: { bg: 'bg-violet-100',  text: 'text-violet-800',  dot: 'bg-violet-500',  ring: 'ring-violet-300'  },
};

const ENTITY_LABELS = { accounts: 'Accounts', issues: 'Issues', escalations: 'Escalations', tasks: 'Tasks', accounts_computed: 'Computed Metrics' };
const ENTITY_ORDER  = ['accounts', 'issues', 'escalations', 'tasks'];
const VIZ_OPTIONS   = [
  { value: 'table', label: 'Table'      },
  { value: 'bar',   label: 'Bar Chart'  },
  { value: 'line',  label: 'Line Chart' },
  { value: 'kpi',   label: 'KPI Cards'  },
];
const AGG_OPTIONS = [
  { value: 'count', label: 'Count'  },
  { value: 'sum',   label: 'Sum of' },
  { value: 'avg',   label: 'Avg of' },
];

/* ─── Helpers ────────────────────────────────────────────────────── */

const colId = c => `${c.entity}__${c.field}`;

function flatKey(col, primaryEntity) {
  if (col.entity === primaryEntity || col.entity === 'accounts_computed') return col.field;
  return 'account__' + col.field;
}

function derivePrimary(selected = []) {
  if (!selected.length) return 'accounts';
  if (selected.length === 1) return selected[0];
  const nonAcct = selected.filter(s => s !== 'accounts');
  if (nonAcct.length === 1) return nonAcct[0];
  return 'accounts';
}

function allFields(selectedEntities = ['accounts']) {
  const primary          = derivePrimary(selectedEntities);
  const includesAccounts = selectedEntities.includes('accounts');
  const nonAcctEntities  = selectedEntities.filter(e => e !== 'accounts');
  const result = [];

  (FIELDS[primary] || []).forEach(f => {
    result.push({ entity: primary, field: f.key, label: f.label, flatKey: f.key, options: f.options, numeric: f.numeric });
  });

  if (primary !== 'accounts' && includesAccounts) {
    ACCOUNT_JOIN_FIELDS.forEach(f => {
      result.push({ entity: 'accounts', field: f.key, label: f.label, flatKey: 'account__' + f.key, options: f.options, numeric: f.numeric });
    });
  }

  if (primary === 'accounts') {
    COMPUTED_FIELDS.filter(f => {
      if (!nonAcctEntities.length) return true;
      if (f.key.includes('issue')      && nonAcctEntities.includes('issues'))      return true;
      if (f.key.includes('escalation') && nonAcctEntities.includes('escalations')) return true;
      if (f.key.includes('task')       && nonAcctEntities.includes('tasks'))       return true;
      return false;
    }).forEach(f => {
      result.push({ entity: 'accounts_computed', field: f.key, label: f.label, flatKey: f.key, numeric: true });
    });
  }

  return result;
}

function formatCell(val) {
  if (val == null) return '–';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    try { return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return val; }
  }
  if (typeof val === 'number') return val.toLocaleString('en-IN');
  return String(val);
}

/* ─── Column picker popover ──────────────────────────────────────── */

function ColumnPicker({ selectedEntities, selectedCols, onToggle, onClose }) {
  const [q, setQ] = useState('');
  const ref = useRef();
  const primary          = derivePrimary(selectedEntities);
  const includesAccounts = selectedEntities.includes('accounts');
  const nonAcctEntities  = selectedEntities.filter(e => e !== 'accounts');

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const lq = q.toLowerCase();
  const groups = [];

  const primaryFs = (FIELDS[primary] || []).filter(f => !lq || f.label.toLowerCase().includes(lq));
  if (primaryFs.length) groups.push({ entity: primary, sectionLabel: `From ${ENTITY_LABELS[primary]}`, fields: primaryFs });

  if (primary !== 'accounts' && includesAccounts) {
    const accFs = ACCOUNT_JOIN_FIELDS.filter(f => !lq || f.label.toLowerCase().includes(lq));
    if (accFs.length) groups.push({ entity: 'accounts', sectionLabel: 'From Accounts (joined)', fields: accFs });
  }

  if (primary === 'accounts') {
    const compFs = COMPUTED_FIELDS.filter(f => {
      const match = !nonAcctEntities.length
        || (f.key.includes('issue')      && nonAcctEntities.includes('issues'))
        || (f.key.includes('escalation') && nonAcctEntities.includes('escalations'))
        || (f.key.includes('task')       && nonAcctEntities.includes('tasks'));
      return match && (!lq || f.label.toLowerCase().includes(lq));
    });
    if (compFs.length) groups.push({ entity: 'accounts_computed', sectionLabel: 'Computed Metrics', fields: compFs });
  }

  return (
    <div ref={ref} className="absolute z-50 top-full right-0 mt-1.5 w-72 bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden">
      <div className="p-2 border-b border-gray-100">
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search fields…"
          className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>
      <div className="max-h-72 overflow-y-auto">
        {groups.map(grp => {
          const colors = EC[grp.entity] || EC.accounts;
          return (
            <div key={grp.entity}>
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 sticky top-0">
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                {grp.sectionLabel}
              </div>
              {grp.fields.map(f => {
                const col = { entity: grp.entity, field: f.key, label: f.label };
                const selected = selectedCols.some(c => colId(c) === colId(col));
                return (
                  <button
                    key={f.key}
                    onClick={() => onToggle(col)}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm transition ${
                      selected ? `${colors.bg} ${colors.text} font-medium` : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{f.label}</span>
                    {selected && (
                      <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
        {groups.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No fields found</p>}
      </div>
    </div>
  );
}

/* ─── Themed field dropdown (replaces native <select> for sort/filter/chart) */

function FieldDropdown({ value, onChange, options, placeholder = 'Select a field…', includeNone = false, noneLabel = 'None', className = '' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState('');
  const ref = useRef();

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQ(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const lq = q.toLowerCase();

  // Build groups in the order fields appear in options (primary entity first)
  const groupOrder = [];
  const groupMap   = {};
  options.filter(af => !lq || af.label.toLowerCase().includes(lq)).forEach(af => {
    if (!groupMap[af.entity]) { groupMap[af.entity] = []; groupOrder.push(af.entity); }
    groupMap[af.entity].push(af);
  });
  const groups = groupOrder.map(ent => ({ entity: ent, fields: groupMap[ent] }));

  const selected = value ? options.find(af => `${af.entity}__${af.field}` === value) : null;
  const sc       = selected ? (EC[selected.entity] || EC.accounts) : null;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setQ(''); }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border rounded-xl bg-white transition focus:outline-none ${
          open ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <span className="flex items-center gap-2 truncate min-w-0">
          {selected ? (
            <>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
              <span className={`${sc.text} truncate font-medium`}>{selected.label}</span>
            </>
          ) : (
            <span className="text-gray-400 truncate">{placeholder}</span>
          )}
        </span>
        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden">
          {options.length > 5 && (
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search fields…"
                className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {includeNone && (
              <button
                onClick={() => { onChange(null); setOpen(false); setQ(''); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition ${!value ? 'bg-gray-100 text-gray-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                {noneLabel}
              </button>
            )}
            {groups.map(grp => {
              const gc = EC[grp.entity] || EC.accounts;
              return (
                <div key={grp.entity}>
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 sticky top-0">
                    <span className={`w-2 h-2 rounded-full ${gc.dot}`} />
                    {ENTITY_LABELS[grp.entity] || grp.entity}
                  </div>
                  {grp.fields.map(af => {
                    const id    = `${af.entity}__${af.field}`;
                    const isSel = value === id;
                    return (
                      <button
                        key={id}
                        onClick={() => { onChange(af); setOpen(false); setQ(''); }}
                        className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm transition ${
                          isSel ? `${gc.bg} ${gc.text} font-medium` : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{af.label}</span>
                        {isSel && (
                          <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {groups.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No fields found</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Config card wrapper ────────────────────────────────────────── */

function Card({ title, children, action }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60 rounded-t-2xl">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ─── Preview panel ──────────────────────────────────────────────── */

function PreviewPanel({ vizType, columns, groupBy, primaryEntity, data }) {
  if (!data) return (
    <div className="flex flex-col items-center justify-center gap-3 text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">No preview yet</p>
        <p className="text-xs text-gray-400 mt-0.5">Configure your report then click <strong>Run Preview</strong></p>
      </div>
    </div>
  );

  if (data.length === 0) return (
    <div className="text-center py-16 text-sm text-gray-400">No rows match your current filters.</div>
  );

  if (vizType === 'table') {
    const displayCols = columns.filter(c => flatKey(c, primaryEntity) in (data[0] || {}));
    return (
      <div className="overflow-auto rounded-xl border border-gray-200 text-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              {displayCols.map(c => {
                const colors = EC[c.entity] || EC.accounts;
                return (
                  <th key={colId(c)} className="px-3 py-2.5 text-left whitespace-nowrap">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                      {c.label}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.slice(0, 50).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                {displayCols.map(c => (
                  <td key={colId(c)} className="px-3 py-2 text-gray-700 max-w-[200px] truncate">
                    {formatCell(row[flatKey(c, primaryEntity)])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 50 && (
          <div className="px-4 py-2 text-xs text-gray-400 text-center border-t border-gray-100 bg-gray-50">
            Showing 50 of {data.length} rows
          </div>
        )}
      </div>
    );
  }

  const gk = groupBy
    ? flatKey(groupBy, primaryEntity)
    : (Object.keys(data[0] || {}).find(k => k !== 'value') || 'label');

  if (vizType === 'bar') return (
    <div className="rounded-xl border border-gray-200 p-4 bg-white">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 55 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={gk} tick={{ fontSize: 11 }} angle={-40} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#2563eb" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  if (vizType === 'line') return (
    <div className="rounded-xl border border-gray-200 p-4 bg-white">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 55 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={gk} tick={{ fontSize: 11 }} angle={-40} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  if (vizType === 'kpi') return (
    <div className="grid grid-cols-2 gap-3">
      {data.slice(0, 8).map((row, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 text-center shadow-sm">
          <div className="text-3xl font-bold text-brand-700">
            {typeof row.value === 'number' ? row.value.toLocaleString('en-IN') : (row.value ?? '–')}
          </div>
          <div className="text-xs text-gray-500 mt-1.5 truncate">{String(row[gk] ?? '–')}</div>
        </div>
      ))}
    </div>
  );

  return null;
}

/* ─── Main builder ───────────────────────────────────────────────── */

const DEFAULT_CONFIG = {
  vizType:          'table',
  selectedEntities: ['accounts'],
  columns: [
    { entity: 'accounts', field: 'account_name', label: 'Account Name' },
    { entity: 'accounts', field: 'rag_status',   label: 'RAG Status'   },
    { entity: 'accounts', field: 'mrr',          label: 'MRR'          },
    { entity: 'accounts', field: 'csm',          label: 'CSM'          },
  ],
  filters:     [],
  groupBy:     null,
  aggregation: { type: 'count', entity: '', field: '' },
  sortBy:      null,
  sortDir:     'desc',
  limit:       200,
  isPublic:    false,
};

export default function CustomReportBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId     = searchParams.get('id');
  const isViewMode = !!(editId && !searchParams.get('edit'));

  const [name, setName]                   = useState('');
  const [description, setDescription]     = useState('');
  const [config, setConfig]               = useState(DEFAULT_CONFIG);
  const [showPicker, setShowPicker]       = useState(false);
  const [preview, setPreview]             = useState(null);
  const [previewTotal, setPreviewTotal]   = useState(null);
  const [running, setRunning]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');

  // Normalize: old saved reports may have primaryEntity instead of selectedEntities
  const selectedEntities = config.selectedEntities
    || (config.primaryEntity ? [config.primaryEntity] : ['accounts']);
  const primaryEntity    = derivePrimary(selectedEntities);

  const isChart          = config.vizType !== 'table';
  const available        = allFields(selectedEntities);
  const numericAvailable = available.filter(f => f.numeric);

  const sortByValue  = config.sortBy       ? `${config.sortBy.entity}__${config.sortBy.field}`             : '';
  const groupByValue = config.groupBy      ? `${config.groupBy.entity}__${config.groupBy.field}`           : '';
  const aggFldValue  = config.aggregation.field ? `${config.aggregation.entity}__${config.aggregation.field}` : '';

  // Load saved report — in view mode, auto-run after loading
  useEffect(() => {
    if (!editId) return;
    axios.get('/api/dropdown-config?resource=custom_reports').then(({ data }) => {
      const report = (Array.isArray(data) ? data : []).find(r => String(r.id) === editId);
      if (report) {
        setName(report.name || '');
        setDescription(report.description || '');
        if (report.config) {
          const cfg = { ...report.config };
          if (!cfg.selectedEntities && cfg.primaryEntity) cfg.selectedEntities = [cfg.primaryEntity];
          const fullConfig = { ...DEFAULT_CONFIG, ...cfg };
          setConfig(fullConfig);
          if (isViewMode) {
            const ents  = fullConfig.selectedEntities || ['accounts'];
            const pEnt  = derivePrimary(ents);
            const isChrt = fullConfig.vizType !== 'table';
            setRunning(true);
            axios.post('/api/dropdown-config?resource=custom_reports', {
              run_config: {
                primaryEntity: pEnt,
                columns:       fullConfig.columns,
                filters:       (fullConfig.filters || []).filter(f => f.values?.length > 0),
                groupBy:       isChrt ? fullConfig.groupBy : null,
                aggregation:   isChrt ? fullConfig.aggregation : null,
                sortBy:        !isChrt ? fullConfig.sortBy : null,
                sortDir:       fullConfig.sortDir,
                limit:         fullConfig.limit,
              },
            }).then(resp => {
              setPreview(resp.data.rows || []);
              setPreviewTotal(resp.data.total ?? null);
            }).catch(e => {
              setError(e?.response?.data?.error || 'Failed to run report');
            }).finally(() => setRunning(false));
          }
        }
      }
    }).catch(() => {});
  }, [editId]);

  function toggleEntity(entity) {
    const current = selectedEntities;
    if (current.includes(entity) && current.length === 1) return;
    const next       = current.includes(entity) ? current.filter(e => e !== entity) : [...current, entity];
    const newPrimary = derivePrimary(next);
    const defaultCols = (FIELDS[newPrimary] || []).slice(0, 4).map(f => ({ entity: newPrimary, field: f.key, label: f.label }));
    setConfig(c => ({ ...c, selectedEntities: next, columns: defaultCols, filters: [], groupBy: null, sortBy: null }));
    setPreview(null);
    setPreviewTotal(null);
  }

  function toggleCol(col) {
    setConfig(c => {
      const id = colId(col);
      return { ...c, columns: c.columns.some(x => colId(x) === id)
        ? c.columns.filter(x => colId(x) !== id)
        : [...c.columns, col] };
    });
  }

  function removeCol(id) { setConfig(c => ({ ...c, columns: c.columns.filter(x => colId(x) !== id) })); }

  function addFilter() {
    const f = available[0];
    if (!f) return;
    setConfig(c => ({ ...c, filters: [...c.filters, { entity: f.entity, field: f.field, label: f.label, flatKey: f.flatKey, values: [] }] }));
  }

  function updateFilter(idx, patch) {
    setConfig(c => ({ ...c, filters: c.filters.map((f, i) => i === idx ? { ...f, ...patch } : f) }));
  }

  function changeFilterField(idx, af) {
    setConfig(c => ({
      ...c,
      filters: c.filters.map((f, i) => i === idx
        ? { entity: af.entity, field: af.field, label: af.label, flatKey: af.flatKey, options: af.options, values: [] }
        : f),
    }));
  }

  function removeFilter(idx) { setConfig(c => ({ ...c, filters: c.filters.filter((_, i) => i !== idx) })); }

  function getFilterOptions(f) {
    if (f.options) return f.options;
    const src = f.entity === 'accounts_computed' ? COMPUTED_FIELDS
      : f.entity === 'accounts' && primaryEntity !== 'accounts' ? ACCOUNT_JOIN_FIELDS
      : (FIELDS[f.entity] || []);
    return src.find(x => x.key === f.field)?.options || null;
  }

  async function runPreview() {
    setRunning(true); setError('');
    try {
      const { data } = await axios.post('/api/dropdown-config?resource=custom_reports', {
        run_config: {
          primaryEntity,
          columns:     config.columns,
          filters:     config.filters.filter(f => f.values?.length > 0),
          groupBy:     isChart ? config.groupBy : null,
          aggregation: isChart ? config.aggregation : null,
          sortBy:      !isChart ? config.sortBy : null,
          sortDir:     config.sortDir,
          limit:       config.limit,
        },
      });
      setPreview(data.rows || []);
      setPreviewTotal(data.total ?? null);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to run report');
    } finally {
      setRunning(false);
    }
  }

  async function save() {
    if (!name.trim()) { setError('Report name is required'); return; }
    setSaving(true); setError('');
    const { isPublic, ...cfgRest } = config;
    const payload = { name: name.trim(), description: description.trim(), config: cfgRest, is_public: isPublic };
    try {
      if (editId) await axios.put(`/api/dropdown-config?resource=custom_reports&id=${editId}`, payload);
      else        await axios.post('/api/dropdown-config?resource=custom_reports', payload);
      navigate('/reports/custom');
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to save');
      setSaving(false);
    }
  }

  const nonAcctSelected = selectedEntities.filter(e => e !== 'accounts');

  // View mode: hide config panel, show full-width results
  if (isViewMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/reports/custom')} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{name || 'Loading…'}</h1>
            {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={runPreview}
            disabled={running}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {running ? 'Running…' : 'Refresh'}
          </button>
          <button
            onClick={() => navigate(`/reports/custom/builder?id=${editId}&edit=1`)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Report
          </button>
        </div>

        {error && <p className="text-sm text-red-600 px-1">{error}</p>}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
            <span className="text-sm font-semibold text-gray-700">Results</span>
            {previewTotal != null && (
              <span className="text-xs text-gray-400">{previewTotal.toLocaleString()} row{previewTotal !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="p-4 min-h-[400px]">
            <PreviewPanel
              vizType={config.vizType}
              columns={config.columns}
              groupBy={config.groupBy}
              primaryEntity={primaryEntity}
              data={preview}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

      {/* ═══ Left panel: config ═══════════════════════════════════ */}
      <div className="w-full lg:w-[440px] xl:w-[480px] flex-shrink-0 space-y-4 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto lg:pb-6 lg:pr-1">

        {/* ── Header / name ── */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/reports/custom')} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Report name *"
              className="w-full text-lg font-semibold bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-brand-500 focus:outline-none pb-0.5 transition placeholder:font-normal placeholder:text-base placeholder:text-gray-400"
            />
          </div>
        </div>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Add a description…"
          className="w-full text-sm text-gray-600 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-gray-300 focus:outline-none pb-0.5 transition placeholder:text-gray-400"
        />

        {/* ── Viz type ── */}
        <Card title="Visualization">
          <div className="grid grid-cols-4 gap-2">
            {VIZ_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setConfig(c => ({ ...c, vizType: opt.value })); setPreview(null); }}
                className={`py-2 rounded-xl text-xs font-semibold border-2 transition ${
                  config.vizType === opt.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        {/* ── Data sources (multi-select) ── */}
        <Card title="Data Sources">
          <div className="grid grid-cols-2 gap-2">
            {ENTITY_ORDER.map(key => {
              const colors   = EC[key];
              const active   = selectedEntities.includes(key);
              const isPrimary = active && key === primaryEntity && selectedEntities.length > 1;
              return (
                <button
                  key={key}
                  onClick={() => toggleEntity(key)}
                  className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition text-left ${
                    active ? `${colors.bg} ${colors.text} border-current` : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${active ? colors.dot : 'bg-gray-300'}`} />
                  <span className="flex-1">{ENTITY_LABELS[key]}</span>
                  {isPrimary && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/70 leading-tight">
                      Primary
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {nonAcctSelected.length > 1 ? (
            <p className="mt-3 text-xs text-gray-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Multiple types — rows grouped by Account with counts per type
            </p>
          ) : primaryEntity !== 'accounts' && selectedEntities.includes('accounts') ? (
            <p className="mt-3 text-xs text-gray-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Account fields available as joined columns
            </p>
          ) : null}
        </Card>

        {/* ── Columns ── */}
        <Card
          title={`Columns${config.columns.length ? ` (${config.columns.length})` : ''}`}
          action={
            <div className="relative">
              <button
                onClick={() => setShowPicker(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add column
              </button>
              {showPicker && (
                <ColumnPicker
                  selectedEntities={selectedEntities}
                  selectedCols={config.columns}
                  onToggle={col => toggleCol(col)}
                  onClose={() => setShowPicker(false)}
                />
              )}
            </div>
          }
        >
          {config.columns.length === 0 ? (
            <p className="text-sm text-gray-400 py-2 text-center">
              Click <strong className="font-medium text-gray-600">Add column</strong> to pick fields
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {config.columns.map(col => {
                const c = EC[col.entity] || EC.accounts;
                return (
                  <span key={colId(col)} className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot} opacity-60`} />
                    {col.label}
                    <button onClick={() => removeCol(colId(col))} className="rounded-full p-0.5 hover:bg-black/10 transition">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Filters ── */}
        <Card
          title="Filters"
          action={
            <button onClick={addFilter} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add filter
            </button>
          }
        >
          {config.filters.length === 0 ? (
            <p className="text-xs text-gray-400">No filters — all records will be included</p>
          ) : (
            <div className="space-y-2.5">
              {config.filters.map((f, idx) => {
                const opts = getFilterOptions(f);
                return (
                  <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2.5">
                    <div className="flex gap-2 items-center">
                      <FieldDropdown
                        value={`${f.entity}__${f.field}`}
                        onChange={af => { if (af) changeFilterField(idx, af); }}
                        options={available}
                        placeholder="Pick a field…"
                        className="flex-1"
                      />
                      <button onClick={() => removeFilter(idx)} className="p-1.5 text-gray-400 hover:text-red-500 transition flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {opts ? (
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
                        {opts.map(opt => (
                          <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={f.values.includes(opt)}
                              onChange={e => updateFilter(idx, {
                                values: e.target.checked ? [...f.values, opt] : f.values.filter(v => v !== opt),
                              })}
                              className="rounded text-brand-600"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        value={f.values.join(', ')}
                        onChange={e => updateFilter(idx, { values: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
                        placeholder="Comma-separated values…"
                        className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Chart setup (charts only) ── */}
        {isChart && (
          <Card title="Chart Setup">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Group by</label>
                <FieldDropdown
                  value={groupByValue}
                  onChange={af => { setConfig(c => ({ ...c, groupBy: af || null })); setPreview(null); }}
                  options={available}
                  placeholder="Select a field…"
                  includeNone
                  noneLabel="No grouping"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Metric</label>
                <div className="flex gap-2">
                  <select
                    value={config.aggregation.type}
                    onChange={e => setConfig(c => ({ ...c, aggregation: { type: e.target.value, entity: '', field: '' } }))}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 flex-shrink-0"
                  >
                    {AGG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {config.aggregation.type !== 'count' && (
                    <FieldDropdown
                      value={aggFldValue}
                      onChange={af => { if (af) setConfig(c => ({ ...c, aggregation: { ...c.aggregation, entity: af.entity, field: af.field, flatKey: af.flatKey } })); }}
                      options={numericAvailable}
                      placeholder="Select field…"
                      className="flex-1"
                    />
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── Sort & limit (table only) ── */}
        {!isChart && (
          <Card title="Sort & Limit">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Sort by column</label>
                <div className="flex gap-2">
                  <FieldDropdown
                    value={sortByValue}
                    onChange={af => setConfig(c => ({ ...c, sortBy: af || null }))}
                    options={available}
                    placeholder="None (default order)"
                    includeNone
                    noneLabel="None (default order)"
                    className="flex-1"
                  />
                  <div className="flex rounded-xl border border-gray-300 overflow-hidden flex-shrink-0 text-xs font-semibold">
                    {[{ v: 'asc', icon: '↑', label: 'Asc' }, { v: 'desc', icon: '↓', label: 'Desc' }].map(({ v, icon, label }) => (
                      <button
                        key={v}
                        onClick={() => setConfig(c => ({ ...c, sortDir: v }))}
                        className={`px-3 py-2 transition ${config.sortDir === v ? 'bg-brand-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                      >
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Row limit</p>
                  <p className="text-xs text-gray-400 mt-0.5">Max 1,000 rows per run</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={config.limit}
                    onChange={e => setConfig(c => ({ ...c, limit: Math.max(1, Math.min(1000, Number(e.target.value) || 200)) }))}
                    min={1} max={1000}
                    className="w-20 border border-gray-300 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-400">rows</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── Share toggle ── */}
        <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer select-none px-1 pb-2">
          <button
            type="button"
            role="switch"
            aria-checked={config.isPublic}
            onClick={() => setConfig(c => ({ ...c, isPublic: !c.isPublic }))}
            className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${config.isPublic ? 'bg-brand-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.isPublic ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
          Share with all users
        </label>

        {error && <p className="text-sm text-red-600 px-1">{error}</p>}

        {/* ── Actions ── */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={runPreview}
            disabled={running}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-brand-600 text-brand-700 text-sm font-semibold rounded-xl hover:bg-brand-50 transition disabled:opacity-50"
          >
            {running
              ? <><span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /> Running…</>
              : 'Run Preview'}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : editId ? 'Update Report' : 'Save Report'}
          </button>
        </div>
      </div>

      {/* ═══ Right panel: preview ═════════════════════════════════ */}
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden sticky top-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
            <span className="text-sm font-semibold text-gray-700">Preview</span>
            {previewTotal != null && (
              <span className="text-xs text-gray-400">{previewTotal.toLocaleString()} row{previewTotal !== 1 ? 's' : ''} fetched</span>
            )}
          </div>
          <div className="p-4 min-h-[320px]">
            <PreviewPanel
              vizType={config.vizType}
              columns={config.columns}
              groupBy={config.groupBy}
              primaryEntity={primaryEntity}
              data={preview}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
