import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';

// Field definitions per entity. `numeric: true` marks fields eligible for sum/avg.
// `options` marks enum fields that get checkboxes in the filter panel.
const ENTITY_FIELDS = {
  accounts: [
    { key: 'account_name', label: 'Account Name' },
    { key: 'tenant_id',    label: 'Tenant ID' },
    { key: 'csm',          label: 'CSM' },
    { key: 'csm_lead',     label: 'CSM Lead' },
    { key: 'rag_status',   label: 'RAG Status', options: ['Green', 'Amber', 'Red'] },
    { key: 'region',       label: 'Region' },
    { key: 'industry',     label: 'Industry' },
    { key: 'mrr',          label: 'MRR', numeric: true },
    { key: 'mrr_tier',     label: 'MRR Tier' },
    { key: 'renewal_date', label: 'Renewal Date' },
    { key: 'golive_date',  label: 'Go-Live Date' },
    { key: 'adoption_score',   label: 'Adoption Score',   numeric: true },
    { key: 'stickiness_score', label: 'Stickiness Score', numeric: true },
  ],
  issues: [
    { key: 'account_name',  label: 'Account Name' },
    { key: 'priority',      label: 'Priority',  options: ['P1', 'P2', 'P3'] },
    { key: 'issue_type',    label: 'Issue Type' },
    { key: 'issue_sub_type',label: 'Issue Sub Type' },
    { key: 'owner_team',    label: 'Owner Team' },
    { key: 'status',        label: 'Status',    options: ['Open', 'Closed'] },
    { key: 'reported_date', label: 'Reported Date' },
    { key: 'closure_date',  label: 'Closure Date' },
    { key: 'csm',           label: 'CSM' },
    { key: 'csm_lead',      label: 'CSM Lead' },
    { key: 'description',   label: 'Description' },
  ],
  escalations: [
    { key: 'account_name',       label: 'Account Name' },
    { key: 'date_of_escalation', label: 'Escalation Date' },
    { key: 'month',              label: 'Month' },
    { key: 'status',             label: 'Status', options: ['Open', 'Closed'] },
    { key: 'csm',                label: 'CSM' },
    { key: 'ownership',          label: 'Ownership' },
    { key: 'trigger_reason',     label: 'Trigger Reason' },
    { key: 'issue_type',         label: 'Issue Type' },
    { key: 'escalated_by',       label: 'Escalated By' },
    { key: 'source_of_escalation', label: 'Source' },
    { key: 'description',        label: 'Description' },
  ],
  tasks: [
    { key: 'task_subject',  label: 'Subject' },
    { key: 'nature_of_task',label: 'Nature of Task' },
    { key: 'account_name',  label: 'Account Name' },
    { key: 'assigned_to',   label: 'Assigned To' },
    { key: 'assigned_by',   label: 'Assigned By' },
    { key: 'due_date',      label: 'Due Date' },
    { key: 'status',        label: 'Status', options: ['Open', 'Completed'] },
  ],
};

const VIZ_OPTIONS = [
  { value: 'table', label: 'Table',      desc: 'Tabular rows & columns' },
  { value: 'bar',   label: 'Bar Chart',  desc: 'Compare values by category' },
  { value: 'line',  label: 'Line Chart', desc: 'Trends over time' },
  { value: 'kpi',   label: 'KPI Cards',  desc: 'Headline numbers' },
];

const ENTITY_OPTIONS = [
  { value: 'accounts',    label: 'Accounts' },
  { value: 'issues',      label: 'Issues' },
  { value: 'escalations', label: 'Escalations' },
  { value: 'tasks',       label: 'Tasks' },
];

const AGG_OPTIONS = [
  { value: 'count', label: 'Count' },
  { value: 'sum',   label: 'Sum of' },
  { value: 'avg',   label: 'Avg of' },
];

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
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

function PreviewPanel({ vizType, config, data, entityFields }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 py-12 text-center">No data matches your filters.</p>;
  }

  if (vizType === 'table') {
    const cols = config.fields.filter(f => data[0] && f in data[0]);
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {cols.map(key => {
                const f = entityFields.find(ef => ef.key === key);
                return (
                  <th key={key} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {f?.label || key}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.slice(0, 50).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {cols.map(key => (
                  <td key={key} className="px-3 py-2 text-gray-700 max-w-[220px] truncate">
                    {formatCell(row[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 50 && (
          <div className="px-3 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
            Showing 50 of {data.length} rows
          </div>
        )}
      </div>
    );
  }

  if (vizType === 'bar') {
    const gk = config.groupBy || Object.keys(data[0] || {})[0] || 'label';
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={gk} tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#2563eb" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (vizType === 'line') {
    const gk = config.groupBy || Object.keys(data[0] || {})[0] || 'label';
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={gk} tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#2563eb" dot={{ r: 3 }} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (vizType === 'kpi') {
    const gk = config.groupBy || Object.keys(data[0] || {}).find(k => k !== 'value') || 'label';
    return (
      <div className="grid grid-cols-2 gap-3">
        {data.slice(0, 8).map((row, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-brand-700">
              {typeof row.value === 'number' ? row.value.toLocaleString('en-IN') : (row.value ?? '–')}
            </div>
            <div className="text-xs text-gray-500 mt-1.5 truncate">{String(row[gk] ?? '–')}</div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export default function CustomReportBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [config, setConfig] = useState({
    vizType: 'table',
    entity: 'accounts',
    fields: ['account_name', 'rag_status', 'mrr'],
    groupBy: '',
    aggregation: { type: 'count', field: '' },
    filters: [],
    sortBy: '',
    sortDir: 'desc',
    limit: 100,
    isPublic: false,
  });
  const [preview, setPreview] = useState(null);
  const [previewTotal, setPreviewTotal] = useState(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const entityFields = ENTITY_FIELDS[config.entity] || [];
  const numericFields = entityFields.filter(f => f.numeric);
  const isChart = config.vizType === 'bar' || config.vizType === 'line' || config.vizType === 'kpi';

  // Load existing report when ?id= is present
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const { data } = await axios.get('/api/dropdown-config?resource=custom_reports');
        const report = (Array.isArray(data) ? data : []).find(r => String(r.id) === editId);
        if (report) {
          setName(report.name || '');
          setDescription(report.description || '');
          setConfig(c => ({ ...c, ...(report.config || {}) }));
        }
      } catch {}
    })();
  }, [editId]);

  function changeEntity(entity) {
    const firstCols = (ENTITY_FIELDS[entity] || []).slice(0, 3).map(f => f.key);
    setConfig(c => ({ ...c, entity, fields: firstCols, groupBy: '', filters: [] }));
    setPreview(null);
    setPreviewTotal(null);
  }

  function toggleField(key) {
    setConfig(c => ({
      ...c,
      fields: c.fields.includes(key) ? c.fields.filter(f => f !== key) : [...c.fields, key],
    }));
  }

  function setFilter(idx, patch) {
    setConfig(c => ({
      ...c,
      filters: c.filters.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    }));
  }

  function addFilter() {
    const firstField = entityFields[0]?.key || '';
    setConfig(c => ({ ...c, filters: [...c.filters, { field: firstField, values: [] }] }));
  }

  function removeFilter(idx) {
    setConfig(c => ({ ...c, filters: c.filters.filter((_, i) => i !== idx) }));
  }

  function buildRunConfig() {
    const { vizType, entity, fields, groupBy, aggregation, filters, sortBy, sortDir, limit } = config;
    return {
      entity,
      fields: isChart ? (groupBy ? [groupBy] : []) : fields,
      groupBy: isChart ? groupBy : undefined,
      aggregation: isChart ? aggregation : undefined,
      filters: filters
        .filter(f => f.field && f.values.length > 0)
        .reduce((acc, f) => { acc[f.field] = f.values; return acc; }, {}),
      sortBy: !isChart ? sortBy : undefined,
      sortDir,
      limit,
    };
  }

  async function runPreview() {
    setRunning(true);
    setError('');
    try {
      const { data } = await axios.post('/api/dropdown-config?resource=custom_reports', {
        run_config: buildRunConfig(),
      });
      setPreview(data.rows || []);
      setPreviewTotal(data.total ?? null);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to run report');
    } finally {
      setRunning(false);
    }
  }

  async function saveReport() {
    if (!name.trim()) { setError('Report name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const { vizType, entity, fields, groupBy, aggregation, filters, sortBy, sortDir, limit, isPublic } = config;
      const payload = {
        name: name.trim(),
        description: description.trim(),
        config: { vizType, entity, fields, groupBy, aggregation, filters, sortBy, sortDir, limit },
        is_public: isPublic,
      };
      if (editId) {
        await axios.put(`/api/dropdown-config?resource=custom_reports&id=${editId}`, payload);
      } else {
        await axios.post('/api/dropdown-config?resource=custom_reports', payload);
      }
      navigate('/reports/custom');
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to save report');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/reports/custom')}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {editId ? 'Edit Report' : 'Build Custom Report'}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: Configuration ── */}
        <div className="space-y-7">

          {/* Report Details */}
          <Section title="Report Details">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Report name *"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Section>

          {/* Visualization Type */}
          <Section title="Visualization Type">
            <div className="grid grid-cols-2 gap-2">
              {VIZ_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setConfig(c => ({ ...c, vizType: opt.value })); setPreview(null); setPreviewTotal(null); }}
                  className={`text-left px-3 py-2.5 rounded-lg border-2 transition ${
                    config.vizType === opt.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="text-sm font-semibold">{opt.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* Data Source */}
          <Section title="Data Source">
            <div className="flex gap-2 flex-wrap">
              {ENTITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => changeEntity(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    config.entity === opt.value
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Fields (table) vs Group By / Metric (charts) */}
          {!isChart ? (
            <Section title="Columns to Show">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {entityFields.map(f => (
                  <label key={f.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.fields.includes(f.key)}
                      onChange={() => toggleField(f.key)}
                      className="rounded text-brand-600"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </Section>
          ) : (
            <Section title="Chart Configuration">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Group By</label>
                <select
                  value={config.groupBy}
                  onChange={e => { setConfig(c => ({ ...c, groupBy: e.target.value })); setPreview(null); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select a field…</option>
                  {entityFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Metric</label>
                <div className="flex gap-2">
                  <select
                    value={config.aggregation.type}
                    onChange={e => setConfig(c => ({
                      ...c,
                      aggregation: { type: e.target.value, field: e.target.value === 'count' ? '' : c.aggregation.field },
                    }))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {AGG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {config.aggregation.type !== 'count' && (
                    <select
                      value={config.aggregation.field}
                      onChange={e => setConfig(c => ({ ...c, aggregation: { ...c.aggregation, field: e.target.value } }))}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select field…</option>
                      {numericFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* Filters */}
          <Section title="Filters">
            {config.filters.length > 0 && (
              <div className="space-y-2">
                {config.filters.map((f, idx) => {
                  const fieldDef = entityFields.find(ef => ef.key === f.field);
                  return (
                    <div key={idx} className="flex gap-2 items-start bg-gray-50 rounded-lg p-2">
                      <select
                        value={f.field}
                        onChange={e => setFilter(idx, { field: e.target.value, values: [] })}
                        className="flex-shrink-0 border border-gray-300 bg-white rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                      >
                        {entityFields.map(ef => <option key={ef.key} value={ef.key}>{ef.label}</option>)}
                      </select>
                      {fieldDef?.options ? (
                        <div className="flex flex-wrap gap-2 flex-1 pt-1">
                          {fieldDef.options.map(opt => (
                            <label key={opt} className="flex items-center gap-1 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={f.values.includes(opt)}
                                onChange={e => setFilter(idx, {
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
                          onChange={e => setFilter(idx, {
                            values: e.target.value.split(',').map(v => v.trim()).filter(Boolean),
                          })}
                          placeholder="Values (comma-separated)"
                          className="flex-1 border border-gray-300 bg-white rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                        />
                      )}
                      <button onClick={() => removeFilter(idx)} className="p-1.5 text-gray-400 hover:text-red-500 flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <button
              onClick={addFilter}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add filter
            </button>
          </Section>

          {/* Sort & Limit (table only) */}
          {!isChart && (
            <Section title="Sort & Limit">
              <div className="flex gap-2">
                <select
                  value={config.sortBy}
                  onChange={e => setConfig(c => ({ ...c, sortBy: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">No sort</option>
                  {entityFields.filter(f => config.fields.includes(f.key)).map(f => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
                <select
                  value={config.sortDir}
                  onChange={e => setConfig(c => ({ ...c, sortDir: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="asc">Asc</option>
                  <option value="desc">Desc</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 flex-shrink-0">Max rows</label>
                <input
                  type="number"
                  value={config.limit}
                  onChange={e => setConfig(c => ({ ...c, limit: Math.max(1, Math.min(1000, Number(e.target.value) || 100)) }))}
                  min={1}
                  max={1000}
                  className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </Section>
          )}

          {/* Share toggle */}
          <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={config.isPublic}
              onClick={() => setConfig(c => ({ ...c, isPublic: !c.isPublic }))}
              className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${config.isPublic ? 'bg-brand-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.isPublic ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            Share with all users
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={runPreview}
              disabled={running}
              className="flex-1 px-4 py-2.5 border-2 border-brand-600 text-brand-700 text-sm font-semibold rounded-lg hover:bg-brand-50 transition disabled:opacity-50"
            >
              {running ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  Running…
                </span>
              ) : 'Run Preview'}
            </button>
            <button
              onClick={saveReport}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : editId ? 'Update Report' : 'Save Report'}
            </button>
          </div>
        </div>

        {/* ── Right: Preview ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</h3>
            {previewTotal != null && (
              <span className="text-xs text-gray-400">{previewTotal} row{previewTotal !== 1 ? 's' : ''} returned</span>
            )}
          </div>

          {preview == null ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center py-20 text-center gap-2">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p className="text-sm text-gray-400">Click <strong className="font-medium text-gray-600">Run Preview</strong> to see your data</p>
            </div>
          ) : (
            <PreviewPanel
              vizType={config.vizType}
              config={config}
              data={preview}
              entityFields={entityFields}
            />
          )}
        </div>
      </div>
    </div>
  );
}
