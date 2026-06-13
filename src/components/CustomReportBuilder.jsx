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

// Account fields available as a join when primary entity ≠ accounts
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

// Computed count columns available when primary entity = accounts
const COMPUTED_FIELDS = [
  { key: 'issues_count',           label: 'Total Issues',         numeric: true },
  { key: 'open_issues_count',      label: 'Open Issues',          numeric: true },
  { key: 'escalations_count',      label: 'Total Escalations',    numeric: true },
  { key: 'open_escalations_count', label: 'Open Escalations',     numeric: true },
  { key: 'tasks_count',            label: 'Total Tasks',          numeric: true },
  { key: 'open_tasks_count',       label: 'Open Tasks',           numeric: true },
];

/* ─── Style tokens ───────────────────────────────────────────────── */

const EC = {
  accounts:          { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500',    ring: 'ring-blue-300'   },
  issues:            { bg: 'bg-rose-100',   text: 'text-rose-800',   dot: 'bg-rose-500',    ring: 'ring-rose-300'   },
  escalations:       { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500',   ring: 'ring-amber-300'  },
  tasks:             { bg: 'bg-emerald-100',text: 'text-emerald-800',dot: 'bg-emerald-500', ring: 'ring-emerald-300'},
  accounts_computed: { bg: 'bg-violet-100', text: 'text-violet-800', dot: 'bg-violet-500',  ring: 'ring-violet-300' },
};

const ENTITY_LABELS = { accounts: 'Accounts', issues: 'Issues', escalations: 'Escalations', tasks: 'Tasks' };
const ENTITY_ORDER  = ['accounts', 'issues', 'escalations', 'tasks'];
const VIZ_OPTIONS   = [
  { value: 'table', label: 'Table' },
  { value: 'bar',   label: 'Bar Chart' },
  { value: 'line',  label: 'Line Chart' },
  { value: 'kpi',   label: 'KPI Cards' },
];
const AGG_OPTIONS = [
  { value: 'count', label: 'Count' },
  { value: 'sum',   label: 'Sum of' },
  { value: 'avg',   label: 'Avg of' },
];

/* ─── Helpers ────────────────────────────────────────────────────── */

// Stable unique key for a column object
const colId = c => `${c.entity}__${c.field}`;

// Result-row key for a column (how it appears in API response data)
function flatKey(col, primaryEntity) {
  if (col.entity === primaryEntity || col.entity === 'accounts_computed') return col.field;
  return 'account__' + col.field;
}

// Collect all browseable fields for filters / groupBy / sortBy pickers
function allFields(primaryEntity) {
  return [
    ...(FIELDS[primaryEntity] || []).map(f => ({ entity: primaryEntity, field: f.key, label: f.label, flatKey: f.key, options: f.options, numeric: f.numeric })),
    ...(primaryEntity !== 'accounts'
      ? ACCOUNT_JOIN_FIELDS.map(f => ({ entity: 'accounts', field: f.key, label: f.label, flatKey: 'account__' + f.key, options: f.options, numeric: f.numeric }))
      : []),
    ...(primaryEntity === 'accounts'
      ? COMPUTED_FIELDS.map(f => ({ entity: 'accounts_computed', field: f.key, label: f.label, flatKey: f.key, numeric: true }))
      : []),
  ];
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

function ColumnPicker({ primaryEntity, selectedCols, onToggle, onClose }) {
  const [q, setQ] = useState('');
  const ref = useRef();

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const lq = q.toLowerCase();

  const groups = [];

  // Primary entity fields
  const primaryFs = (FIELDS[primaryEntity] || []).filter(f => !lq || f.label.toLowerCase().includes(lq));
  if (primaryFs.length) groups.push({ entity: primaryEntity, sectionLabel: `From ${ENTITY_LABELS[primaryEntity]}`, fields: primaryFs });

  // Joined account fields (when primary ≠ accounts)
  if (primaryEntity !== 'accounts') {
    const accFs = ACCOUNT_JOIN_FIELDS.filter(f => !lq || f.label.toLowerCase().includes(lq));
    if (accFs.length) groups.push({ entity: 'accounts', sectionLabel: 'From Accounts (joined)', fields: accFs });
  }

  // Computed metrics (when primary = accounts)
  if (primaryEntity === 'accounts') {
    const compFs = COMPUTED_FIELDS.filter(f => !lq || f.label.toLowerCase().includes(lq));
    if (compFs.length) groups.push({ entity: 'accounts_computed', sectionLabel: 'Computed Metrics', fields: compFs });
  }

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full right-0 mt-1.5 w-72 bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden"
    >
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
              <div className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 sticky top-0`}>
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
        {groups.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No fields found</p>
        )}
      </div>
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
    const displayCols = columns.filter(c => {
      const fk = flatKey(c, primaryEntity);
      return fk in (data[0] || {});
    });
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
  vizType: 'table',
  primaryEntity: 'accounts',
  columns: [
    { entity: 'accounts', field: 'account_name',   label: 'Account Name' },
    { entity: 'accounts', field: 'rag_status',     label: 'RAG Status'   },
    { entity: 'accounts', field: 'mrr',            label: 'MRR'          },
    { entity: 'accounts', field: 'csm',            label: 'CSM'          },
  ],
  filters: [],
  groupBy: null,
  aggregation: { type: 'count', entity: '', field: '' },
  sortBy: null,
  sortDir: 'desc',
  limit: 200,
  isPublic: false,
};

export default function CustomReportBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [config, setConfig]           = useState(DEFAULT_CONFIG);
  const [showPicker, setShowPicker]   = useState(false);
  const [preview, setPreview]         = useState(null);
  const [previewTotal, setPreviewTotal] = useState(null);
  const [running, setRunning]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const isChart = config.vizType !== 'table';
  const available = allFields(config.primaryEntity);
  const numericAvailable = available.filter(f => f.numeric);

  // Load saved report when ?id= present
  useEffect(() => {
    if (!editId) return;
    axios.get('/api/dropdown-config?resource=custom_reports').then(({ data }) => {
      const report = (Array.isArray(data) ? data : []).find(r => String(r.id) === editId);
      if (report) {
        setName(report.name || '');
        setDescription(report.description || '');
        if (report.config) setConfig(c => ({ ...DEFAULT_CONFIG, ...report.config }));
      }
    }).catch(() => {});
  }, [editId]);

  function changePrimary(entity) {
    const defaultCols = (FIELDS[entity] || []).slice(0, 4).map(f => ({
      entity, field: f.key, label: f.label,
    }));
    setConfig(c => ({ ...c, primaryEntity: entity, columns: defaultCols, filters: [], groupBy: null, sortBy: null }));
    setPreview(null);
    setPreviewTotal(null);
  }

  function toggleCol(col) {
    setConfig(c => {
      const id = colId(col);
      const already = c.columns.some(x => colId(x) === id);
      return {
        ...c,
        columns: already ? c.columns.filter(x => colId(x) !== id) : [...c.columns, col],
      };
    });
  }

  function removeCol(id) {
    setConfig(c => ({ ...c, columns: c.columns.filter(x => colId(x) !== id) }));
  }

  function addFilter() {
    const f = available[0];
    if (!f) return;
    setConfig(c => ({
      ...c,
      filters: [...c.filters, { entity: f.entity, field: f.field, label: f.label, flatKey: f.flatKey, values: [] }],
    }));
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

  function removeFilter(idx) {
    setConfig(c => ({ ...c, filters: c.filters.filter((_, i) => i !== idx) }));
  }

  function getFilterOptions(f) {
    if (f.options) return f.options;
    const src = f.entity === 'accounts_computed' ? COMPUTED_FIELDS
      : f.entity === 'accounts' && config.primaryEntity !== 'accounts' ? ACCOUNT_JOIN_FIELDS
      : (FIELDS[f.entity] || []);
    return src.find(x => x.key === f.field)?.options || null;
  }

  async function runPreview() {
    setRunning(true);
    setError('');
    try {
      const { data } = await axios.post('/api/dropdown-config?resource=custom_reports', {
        run_config: {
          primaryEntity: config.primaryEntity,
          columns: config.columns,
          filters: config.filters.filter(f => f.values?.length > 0),
          groupBy: isChart ? config.groupBy : null,
          aggregation: isChart ? config.aggregation : null,
          sortBy: !isChart ? config.sortBy : null,
          sortDir: config.sortDir,
          limit: config.limit,
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
    setSaving(true);
    setError('');
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

  /* ── Chip colors for column tags ── */
  function chipColors(entity) { return EC[entity] || EC.accounts; }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

      {/* ═══ Left panel: config ═══════════════════════════════════ */}
      <div className="w-full lg:w-[440px] xl:w-[480px] flex-shrink-0 space-y-4 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto lg:pb-6 lg:pr-1">

        {/* ── Header / name ── */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/reports/custom')}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition flex-shrink-0"
          >
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
                  config.vizType === opt.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        {/* ── Data source ── */}
        <Card title="Data Source">
          <div className="grid grid-cols-2 gap-2">
            {ENTITY_ORDER.map(key => {
              const colors = EC[key];
              const active = config.primaryEntity === key;
              return (
                <button
                  key={key}
                  onClick={() => changePrimary(key)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition ${
                    active ? `${colors.bg} ${colors.text} border-current` : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${active ? colors.dot : 'bg-gray-300'}`} />
                  {ENTITY_LABELS[key]}
                </button>
              );
            })}
          </div>
          {config.primaryEntity !== 'accounts' && (
            <p className="mt-3 text-xs text-gray-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Account fields can be included as joined columns below
            </p>
          )}
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
                  primaryEntity={config.primaryEntity}
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
                const c = chipColors(col.entity);
                return (
                  <span key={colId(col)} className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot} opacity-60`} />
                    {col.label}
                    <button
                      onClick={() => removeCol(colId(col))}
                      className="rounded-full p-0.5 hover:bg-black/10 transition"
                    >
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
            <button
              onClick={addFilter}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
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
                    <div className="flex gap-2">
                      <select
                        value={`${f.entity}__${f.field}`}
                        onChange={e => {
                          const found = available.find(af => `${af.entity}__${af.field}` === e.target.value);
                          if (found) changeFilterField(idx, found);
                        }}
                        className="flex-1 border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {available.map(af => (
                          <option key={`${af.entity}__${af.field}`} value={`${af.entity}__${af.field}`}>
                            {af.entity !== config.primaryEntity ? `[Account] ${af.label}` : af.label}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => removeFilter(idx)} className="p-1.5 text-gray-400 hover:text-red-500 transition">
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
                        onChange={e => updateFilter(idx, {
                          values: e.target.value.split(',').map(v => v.trim()).filter(Boolean),
                        })}
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
                <select
                  value={config.groupBy ? `${config.groupBy.entity}__${config.groupBy.field}` : ''}
                  onChange={e => {
                    const found = available.find(af => `${af.entity}__${af.field}` === e.target.value);
                    setConfig(c => ({ ...c, groupBy: found || null }));
                    setPreview(null);
                  }}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select a field…</option>
                  {available.map(af => (
                    <option key={`${af.entity}__${af.field}`} value={`${af.entity}__${af.field}`}>
                      {af.entity !== config.primaryEntity ? `[Account] ${af.label}` : af.label}
                    </option>
                  ))}
                </select>
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
                    <select
                      value={config.aggregation.field ? `${config.aggregation.entity}__${config.aggregation.field}` : ''}
                      onChange={e => {
                        const found = numericAvailable.find(af => `${af.entity}__${af.field}` === e.target.value);
                        if (found) setConfig(c => ({ ...c, aggregation: { ...c.aggregation, entity: found.entity, field: found.field, flatKey: found.flatKey } }));
                      }}
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select field…</option>
                      {numericAvailable.map(af => (
                        <option key={`${af.entity}__${af.field}`} value={`${af.entity}__${af.field}`}>
                          {af.entity !== config.primaryEntity ? `[Account] ${af.label}` : af.label}
                        </option>
                      ))}
                    </select>
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
              {/* Sort by */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Sort by column</label>
                <div className="flex gap-2">
                  <select
                    value={config.sortBy ? `${config.sortBy.entity}__${config.sortBy.field}` : ''}
                    onChange={e => {
                      const found = available.find(af => `${af.entity}__${af.field}` === e.target.value);
                      setConfig(c => ({ ...c, sortBy: found || null }));
                    }}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">None (default order)</option>
                    {available.map(af => (
                      <option key={`${af.entity}__${af.field}`} value={`${af.entity}__${af.field}`}>
                        {af.entity !== config.primaryEntity ? `[Account] ${af.label}` : af.label}
                      </option>
                    ))}
                  </select>
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
              {/* Row limit */}
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
              primaryEntity={config.primaryEntity}
              data={preview}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
