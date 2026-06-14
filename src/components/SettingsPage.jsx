import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FIELD_CATALOG } from '../fieldCatalog';
import { useFieldLabels } from '../context/FieldLabelsContext';
import { usePermissions, getDefaultPermsForRole, PERM_OBJECTS, PERM_ACTIONS } from '../context/PermissionsContext';
import { useAiConfig } from '../context/AiConfigContext';
import { useFeatures } from '../hooks/useFeatures';
import { timeAgo, fullTime } from './LastEdited';
import SelectDropdown from './SelectDropdown';
import { applyTheme, generateScale, scaleToHex } from '../utils/colorTheme';

// Users seen within this window count as currently active.
const ACTIVE_WINDOW_MIN = 5;

function ActiveStatus({ at }) {
  if (!at) return <span className="text-xs text-gray-300">Never</span>;
  const diffMin = (Date.now() - new Date(at).getTime()) / 60000;
  const online = diffMin >= 0 && diffMin < ACTIVE_WINDOW_MIN;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" title={fullTime(at)}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${online ? 'bg-green-500' : 'bg-gray-300'}`} />
      <span className={online ? 'text-green-700 font-medium' : 'text-gray-500'}>
        {online ? 'Active now' : timeAgo(at)}
      </span>
    </span>
  );
}

const ROLE_BADGE = {
  admin:       'bg-brand-100 text-brand-700',
  csm:         'bg-gray-100 text-gray-600',
  sales:       'bg-purple-100 text-purple-700',
  product:     'bg-blue-100 text-blue-700',
  cx_strategy: 'bg-teal-100 text-teal-700',
  ps:          'bg-indigo-100 text-indigo-700',
};

const TEAM_OPTIONS = ['India EV', 'India FS', 'US', 'ROW'];

const EMPTY_FORM = { name: '', email: '', password: '', role: 'csm', csm_name: '', csm_lead: '', team: '' };

const DD_FIELDS = [
  { key: 'escalation_status',    label: 'Escalation Status',    section: 'Escalations' },
  { key: 'ownership',            label: 'Ownership',            section: 'Escalations' },
  { key: 'escalated_by',         label: 'Escalated By',         section: 'Escalations' },
  { key: 'ps_leader',            label: 'PS Leader',            section: 'Escalations' },
  { key: 'trigger_reason',       label: 'Trigger Reason',       section: 'Escalations' },
  { key: 'source_of_escalation', label: 'Source of Escalation', section: 'Escalations' },
  { key: 'issue_type',           label: 'Issue Type',           section: 'Escalations' },
  { key: 'issue_sub_type',       label: 'Issue Sub-Type',       section: 'Escalations' },
  { key: 'mrr_tier',             label: 'MRR Tier',             section: 'Accounts' },
  { key: 'rag_status',           label: 'RAG Status',           section: 'Accounts' },
  { key: 'billing_frequency',    label: 'Billing Frequency',    section: 'Accounts' },
  { key: 'renewal_status',       label: 'Renewal Status',       section: 'Accounts' },
  { key: 'churn_status',         label: 'Churn Status',         section: 'Accounts' },
  { key: 'contraction_risk',     label: 'Contraction Risk',     section: 'Accounts' },
  { key: 'churn_risk',           label: 'Churn Risk',           section: 'Accounts' },
  { key: 'implementation_status',label: 'Implementation Status',section: 'Accounts' },
  { key: 'nature_of_task',        label: 'Nature of Task',        section: 'Tasks' },
  { key: 'fr_related_to',        label: 'FR: Related To',        section: 'Feature Requests' },
];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function buildTree(users) {
  const byName = {};
  users.forEach(u => { if (u.csm_name) byName[u.csm_name] = u; });
  const childrenMap = {};
  const roots = [];
  users.forEach(u => {
    const parent = u.csm_lead ? byName[u.csm_lead] : null;
    if (parent && parent.id !== u.id) {
      if (!childrenMap[parent.id]) childrenMap[parent.id] = [];
      childrenMap[parent.id].push(u);
    } else {
      roots.push(u);
    }
  });
  return { roots, childrenMap };
}

function ChildConnector({ isFirst, isLast, isOnly }) {
  if (isOnly) return <div className="w-px h-8 bg-gray-200 mx-auto" />;
  return (
    <div className="relative h-8 w-full">
      <div className="absolute top-0 h-px bg-gray-200" style={{ left: isFirst ? '50%' : '0', right: isLast ? '50%' : '0' }} />
      <div className="absolute w-px bg-gray-200" style={{ top: 0, bottom: 0, left: 'calc(50% - 0.5px)' }} />
    </div>
  );
}

function OrgNode({ u, childrenMap, currentUserId, onEdit, onDelete, deleting }) {
  const kids = childrenMap[u.id] || [];
  const avatarCls = u.role === 'admin' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700';
  return (
    <div className="flex flex-col items-center">
      <div className="w-44 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-brand-300 transition group">
        <div className="p-3">
          <div className="flex items-center gap-2.5 mb-2">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarCls}`}>
              {getInitials(u.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate leading-snug">
                {u.name}
                {u.id === currentUserId && <span className="block text-xs font-normal text-gray-400">(you)</span>}
              </p>
            </div>
          </div>
          <div className="mb-1.5"><ActiveStatus at={u.last_active_at} /></div>
          {u.team && <p className="text-xs text-gray-400 mb-1.5 truncate" title={u.team}>{u.team}</p>}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => onEdit(u)} className="p-1 text-gray-400 hover:text-brand-600 rounded transition" title="Edit">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              {u.id !== currentUserId && (
                <button onClick={() => onDelete(u)} disabled={deleting === u.id} className="p-1 text-gray-400 hover:text-red-500 rounded transition disabled:opacity-50" title="Delete">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
            </div>
          </div>
          {u.csm_name && <p className="text-xs text-gray-400 mt-1.5 truncate">{u.csm_name}</p>}
        </div>
      </div>
      {kids.length > 0 && (
        <div className="flex flex-col items-center w-full">
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex items-start">
            {kids.map((k, i) => (
              <div key={k.id} className="flex flex-col items-center" style={{ minWidth: '11rem', paddingLeft: 8, paddingRight: 8 }}>
                <ChildConnector isFirst={i === 0} isLast={i === kids.length - 1} isOnly={kids.length === 1} />
                <OrgNode u={k} childrenMap={childrenMap} currentUserId={currentUserId} onEdit={onEdit} onDelete={onDelete} deleting={deleting} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const NAV_ITEMS = [
  {
    key: 'users',
    label: 'Manage Users',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'fields',
    label: 'Field Management',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h7M4 18h7m4 0l2 2 4-4" />
      </svg>
    ),
  },
  {
    key: 'feature-requests',
    label: 'Feature Requests',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
  },
  {
    key: 'permissions',
    label: 'Permissions',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    key: 'ai',
    label: 'AI',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    key: 'api',
    label: 'API Access',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    key: 'appearance',
    label: 'Appearance',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
];

const AI_PROVIDERS = [
  ['anthropic', 'Anthropic (Claude)'],
  ['openai',    'OpenAI (GPT)'],
  ['gemini',    'Google Gemini'],
];

const AI_PROMPT_FIELDS = [
  ['account_summary', 'Account Summary', 'How to summarize an account (≤200 words).'],
  ['account_escalations', 'Account — Escalations', 'How to summarize an account\'s escalations.'],
  ['account_issues',      'Account — Issues', 'How to summarize an account\'s issues.'],
  ['feature_request', 'Feature Request Recommendation', 'How to recommend take-up, priority and ETA from linked data.'],
  ['rag',             'RAG Report Analysis', 'How to analyze each RAG band (Red/Amber/Green).'],
  ['issues_overview',       'Issues Overview', 'How to summarize the filtered issues in view.'],
  ['escalations_overview',  'Escalations Overview', 'How to summarize the filtered escalations in view.'],
  ['issue_next_steps',      'Issue Next Steps', 'How to recommend next steps for a single issue.'],
  ['escalation_next_steps', 'Escalation Next Steps', 'How to recommend next steps for a single escalation.'],
];

const API_METHOD_BADGE = {
  GET:  'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT:  'bg-amber-100 text-amber-700',
};

// Open REST API reference rendered in Settings → API Access.
const API_DOCS = [
  {
    entity: 'Accounts',
    endpoints: [
      ['GET',  '/api/accounts',       'List accounts. Optional filters: csm, industry, region, rag_status, churn_status, mrr_tier, search.'],
      ['GET',  '/api/accounts/{id}',  'Get one account (includes recent activity log).'],
      ['POST', '/api/accounts',       'Create an account. Required: account_name. Accepts any editable field — tenant_id, csm, csm_lead, region, industry, mrr, mrr_tier, rag_status, renewal_date, renewal_status, churn_status, golive_date, poc1_name/email/phone, adoption_score, …'],
      ['PUT',  '/api/accounts/{id}',  'Edit an account. Partial update — send only the fields you want to change.'],
    ],
    example: `curl -X POST {BASE}/api/accounts \\
  -H "Authorization: Bearer csmos_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"account_name":"Acme Corp","tenant_id":"acme1","csm":"Jane Doe","region":"North","mrr":250000,"rag_status":"Green"}'`,
  },
  {
    entity: 'Issues',
    endpoints: [
      ['GET',  '/api/issues',         'List issues. Optional filters: account_id, status, csm, issue_type, priority.'],
      ['POST', '/api/issues',         'Create an issue. Required: description. Fields: account_id, account_name, tenant_id, csm, csm_lead, priority, status, issue_type, issue_sub_type, owner_team, support_ticket, dev_ticket, reported_date, closure_date, next_steps.'],
      ['PUT',  '/api/issues?id={id}', 'Edit an issue. Full update — send the complete record; fields you omit are cleared.'],
    ],
    example: `curl -X POST {BASE}/api/issues \\
  -H "Authorization: Bearer csmos_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"description":"Dashboard report times out","account_id":12,"account_name":"Acme Corp","priority":"P1","status":"Open","issue_type":"Performance","reported_date":"2026-06-12"}'`,
  },
  {
    entity: 'Escalations',
    endpoints: [
      ['GET',  '/api/escalations',      'List escalations. Optional filters: account_id, status, csm, month.'],
      ['GET',  '/api/escalations/{id}', 'Get one escalation.'],
      ['POST', '/api/escalations',      'Create an escalation. Required: description. Fields: account_id, account_name, tenant_id, date_of_escalation, month, status, csm, ownership, eta, action_taken, email_subject, ps_leader, escalated_by, trigger_reason, source_of_escalation, issue_type, issue_sub_type.'],
      ['PUT',  '/api/escalations/{id}', 'Edit an escalation. Partial update — send only the fields you want to change.'],
    ],
    example: `curl -X POST {BASE}/api/escalations \\
  -H "Authorization: Bearer csmos_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"description":"Customer escalated downtime issue","account_id":12,"account_name":"Acme Corp","date_of_escalation":"2026-06-12","status":"Open","escalated_by":"Customer CTO"}'`,
  },
  {
    entity: 'Tasks',
    endpoints: [
      ['GET',  '/api/tasks',          'List tasks. Optional filter: account_id.'],
      ['POST', '/api/tasks',          'Create a task. Required: task_subject, due_date (ISO datetime). Fields: task_description, nature_of_task, account_id, account_name, assigned_to, assigned_to_id.'],
      ['PUT',  '/api/tasks?id={id}',  'Edit a task. Partial update. Fields: task_subject, task_description, nature_of_task, due_date, account_id, account_name, assigned_to, status (Open / Completed).'],
    ],
    example: `curl -X POST {BASE}/api/tasks \\
  -H "Authorization: Bearer csmos_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"task_subject":"Follow up on renewal","due_date":"2026-06-20T10:00:00Z","account_id":12,"account_name":"Acme Corp","assigned_to":"Jane Doe"}'`,
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { isEnabled } = useFeatures();
  const navigate = useNavigate();

  const [settingsPage, setSettingsPage] = useState('users');

  // Users state
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [viewMode,  setViewMode]  = useState('list');
  const [showModal, setShowModal] = useState(false);
  const [editUser,  setEditUser]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [deleting,  setDeleting]  = useState(null);

  // Replace-user modal
  const [replaceFor,        setReplaceFor]        = useState(null);
  const [replaceWith,       setReplaceWith]       = useState('');
  const [replaceDeactivate, setReplaceDeactivate] = useState(true);
  const [replacing,         setReplacing]         = useState(false);

  // Dropdown config state
  const [ddData,      setDdData]      = useState({});
  const [ddLoading,   setDdLoading]   = useState(true);
  const [ddField,     setDdField]     = useState('escalation_status');
  const [ddAddValue,  setDdAddValue]  = useState('');
  const [ddAddParent, setDdAddParent] = useState('');
  const [ddAdding,    setDdAdding]    = useState(false);
  const [ddEditId,    setDdEditId]    = useState(null);
  const [ddEditValue, setDdEditValue] = useState('');
  const [ddEditParent,setDdEditParent]= useState('');
  const [ddSaving,    setDdSaving]    = useState(false);

  // Feature Requests settings
  const [frApprover,     setFrApprover]     = useState('');
  const [frApproverSaving, setFrApproverSaving] = useState(false);

  const { reload: reloadPerms } = usePermissions();

  // Permissions tab state
  const [permRole, setPermRole] = useState('cx_strategy');
  const [permEdits, setPermEdits] = useState({});
  const [permSaving, setPermSaving] = useState(false);

  // AI settings
  const { ai: aiConfig, reload: reloadAi } = useAiConfig();
  const [aiForm,   setAiForm]   = useState({ provider: '', keys: {}, models: {}, prompts: {} });
  const [aiSaving, setAiSaving] = useState(false);
  const [aiMsg,    setAiMsg]    = useState('');

  // API Access (open REST API keys)
  const [apiKeys,     setApiKeys]     = useState([]);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [createdKey,  setCreatedKey]  = useState(null); // { key, label } — shown once
  const [keyError,    setKeyError]    = useState('');
  const [copiedTag,   setCopiedTag]   = useState('');

  // Field renaming
  const { rows: labelRows, reload: labelsReload } = useFieldLabels();
  const [fieldsTab,    setFieldsTab]    = useState('dropdowns'); // dropdowns | rename
  const [renameObj,    setRenameObj]    = useState('accounts');
  const [renameEdits,  setRenameEdits]  = useState({});
  const [renameSaving, setRenameSaving] = useState(null);
  const [descEdits,    setDescEdits]    = useState({});
  const [descSaving,   setDescSaving]   = useState(null);

  // Appearance / color theme
  const [themeColor,   setThemeColor]   = useState('');
  const [hexInput,     setHexInput]     = useState('');
  const [themeSaving,  setThemeSaving]  = useState(false);
  const [themeMsg,     setThemeMsg]     = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin' && user.role !== 'cx_strategy') { navigate('/'); return; }
    if (user.role === 'admin') {
      loadUsers();
    }
    loadDD();
    if (user.role === 'cx_strategy') {
      setSettingsPage('fields');
      setFieldsTab('dropdowns');
    }
  }, [user]);

  useEffect(() => {
    const cfg = ddData.fr_default_approver?.[0];
    if (cfg) setFrApprover(cfg.value);
  }, [ddData]);

  // Prefill the AI form from the (key-free) public config.
  useEffect(() => {
    if (!aiConfig) return;
    setAiForm({
      provider: aiConfig.provider || '',
      keys: {},
      models: { ...(aiConfig.models || {}) },
      prompts: { ...(aiConfig.prompts || {}) },
    });
  }, [aiConfig]);

  // ── API keys ──────────────────────────────────────────────────
  useEffect(() => {
    if (settingsPage !== 'api' || user?.role !== 'admin') return;
    axios.get('/api/admin/users?resource=api_keys')
      .then(r => setApiKeys(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [settingsPage, user]);

  // ── Appearance — load saved theme on tab open ─────────────────
  useEffect(() => {
    if (settingsPage !== 'appearance' || user?.role !== 'admin') return;
    axios.get('/api/admin/users?resource=org_settings')
      .then(r => {
        const c = r.data?.theme_color || '';
        setThemeColor(c);
        setHexInput(c);
      })
      .catch(() => {});
  }, [settingsPage, user]);

  const copyText = (text, tag) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedTag(tag);
      setTimeout(() => setCopiedTag(''), 1500);
    }).catch(() => {});
  };

  const createApiKey = async () => {
    const label = newKeyLabel.trim();
    if (!label) { setKeyError('Give the key a label (e.g. "LeadSquared sync")'); return; }
    setCreatingKey(true); setKeyError('');
    try {
      const { data } = await axios.post('/api/admin/users', { resource: 'api_keys', label });
      const { key, ...row } = data;
      setCreatedKey({ key, label: row.label });
      setApiKeys(prev => [row, ...prev]);
      setNewKeyLabel('');
    } catch (e) {
      setKeyError(e.response?.data?.error || 'Failed to create key');
    } finally { setCreatingKey(false); }
  };

  const revokeApiKey = async (k, revoke) => {
    if (revoke && !confirm(`Revoke "${k.label}"? Integrations using this key will stop working immediately.`)) return;
    try {
      const { data } = await axios.put(`/api/admin/users?resource=api_keys&id=${k.id}`, { resource: 'api_keys', revoke });
      setApiKeys(prev => prev.map(x => x.id === k.id ? data : x));
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const deleteApiKey = async (k) => {
    if (!confirm(`Permanently delete "${k.label}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/admin/users?resource=api_keys&id=${k.id}`);
      setApiKeys(prev => prev.filter(x => x.id !== k.id));
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const saveAi = async () => {
    setAiSaving(true); setAiMsg('');
    try {
      await axios.post('/api/dropdown-config', {
        action: 'ai_save',
        provider: aiForm.provider,
        keys: aiForm.keys,            // only non-empty values are applied server-side
        models: aiForm.models,
        prompts: aiForm.prompts,
      });
      await reloadAi();
      setAiForm(f => ({ ...f, keys: {} }));   // never keep key text around
      setAiMsg('Saved');
      setTimeout(() => setAiMsg(''), 2500);
    } catch (e) { setAiMsg(e.response?.data?.error || 'Failed to save'); }
    finally { setAiSaving(false); }
  };

  const clearAiKey = async (p) => {
    if (!window.confirm(`Remove the ${p} API key?`)) return;
    try {
      await axios.post('/api/dropdown-config', { action: 'ai_save', clear: [p] });
      await reloadAi();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  useEffect(() => {
    const defaults = getDefaultPermsForRole(permRole);
    const stored = ddData.role_permissions?.find(r => r.value === permRole);
    if (!stored) { setPermEdits(defaults); return; }
    try {
      const parsed = JSON.parse(stored.parent_value);
      const merged = {};
      PERM_OBJECTS.forEach(o => {
        merged[o.key] = { ...defaults[o.key], ...(parsed[o.key] || {}) };
      });
      setPermEdits(merged);
    } catch { setPermEdits(defaults); }
  }, [permRole, ddData.role_permissions]);

  const loadUsers = () => {
    setLoading(true);
    axios.get('/api/admin/users')
      .then(r => setUsers(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadDD = () => {
    setDdLoading(true);
    axios.get('/api/dropdown-config')
      .then(r => setDdData(r.data || {}))
      .catch(() => {})
      .finally(() => setDdLoading(false));
  };

  const openAdd = () => { setEditUser(null); setForm(EMPTY_FORM); setError(''); setShowModal(true); };
  const openEdit = (u) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, csm_name: u.csm_name || '', csm_lead: u.csm_lead || '', team: u.team || '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) { setError('Name and email are required'); return; }
    if (!editUser && !form.password) { setError('Password is required for new users'); return; }
    setSaving(true); setError('');
    try {
      const payload = { name: form.name, email: form.email, role: form.role, csm_name: form.csm_name, csm_lead: form.csm_lead, team: form.team };
      if (form.password) payload.password = form.password;
      if (editUser) await axios.put(`/api/admin/users?id=${editUser.id}`, payload);
      else await axios.post('/api/admin/users', { ...payload, password: form.password });
      setShowModal(false); loadUsers();
    } catch (e) { setError(e.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    setDeleting(u.id);
    try { await axios.delete(`/api/admin/users?id=${u.id}`); loadUsers(); }
    catch (e) { alert(e.response?.data?.error || 'Failed to delete'); }
    finally { setDeleting(null); }
  };

  const toggleActive = async (u) => {
    const active = u.is_active !== false;
    try {
      const { data } = await axios.put(`/api/admin/users?id=${u.id}`, { is_active: !active });
      setUsers(list => list.map(x => x.id === u.id ? { ...x, is_active: data.is_active } : x));
    } catch (e) { alert(e.response?.data?.error || 'Failed to update'); }
  };

  const handleReplace = async () => {
    if (!replaceFor || !replaceWith) return;
    setReplacing(true);
    try {
      await axios.post('/api/admin/users?resource=replace', {
        old_user_id: replaceFor.id,
        new_user_id: Number(replaceWith),
        deactivate_old: replaceDeactivate,
      });
      setReplaceFor(null); setReplaceWith(''); setReplaceDeactivate(true);
      loadUsers();
    } catch (e) { alert(e.response?.data?.error || 'Failed to replace user'); }
    finally { setReplacing(false); }
  };

  const handleDdAdd = async () => {
    if (!ddAddValue.trim()) return;
    setDdAdding(true);
    try {
      await axios.post('/api/dropdown-config', {
        field_name: ddField,
        value: ddAddValue.trim(),
        parent_value: ddField === 'issue_sub_type' ? ddAddParent : null,
        sort_order: (ddData[ddField]?.length || 0) + 1,
      });
      setDdAddValue(''); setDdAddParent('');
      loadDD();
    } catch (e) { alert(e.response?.data?.error || 'Failed to add'); }
    finally { setDdAdding(false); }
  };

  const handleDdEdit = async (id) => {
    if (!ddEditValue.trim()) return;
    setDdSaving(true);
    try {
      await axios.put(`/api/dropdown-config?id=${id}`, {
        value: ddEditValue.trim(),
        parent_value: ddField === 'issue_sub_type' ? ddEditParent : undefined,
      });
      setDdEditId(null); loadDD();
    } catch (e) { alert(e.response?.data?.error || 'Failed to save'); }
    finally { setDdSaving(false); }
  };

  const handleDdDelete = async (id, value) => {
    if (!window.confirm(`Delete "${value}"?`)) return;
    try { await axios.delete(`/api/dropdown-config?id=${id}`); loadDD(); }
    catch (e) { alert(e.response?.data?.error || 'Failed to delete'); }
  };

  const startDdEdit = (item) => {
    setDdEditId(item.id);
    setDdEditValue(item.value);
    setDdEditParent(item.parent_value || '');
  };

  const handleDdReorder = async (item, direction) => {
    const items = ddData[ddField] || [];
    const idx = items.findIndex(x => x.id === item.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const other = items[swapIdx];
    const order1 = item.sort_order ?? idx + 1;
    const order2 = other.sort_order ?? swapIdx + 1;
    await Promise.all([
      axios.put(`/api/dropdown-config?id=${item.id}`,  { sort_order: order1 === order2 ? swapIdx + 1 : order2 }),
      axios.put(`/api/dropdown-config?id=${other.id}`, { sort_order: order1 === order2 ? idx + 1    : order1 }),
    ]);
    loadDD();
  };

  const customLabelFor = (objKey, fieldKey) =>
    labelRows.find(r => r.value === `${objKey}.${fieldKey}`);

  const customDescFor = (objKey, fieldKey) =>
    (ddData.field_description || []).find(r => r.value === `${objKey}.${fieldKey}`);

  const handleDescSave = async (objKey, fieldKey) => {
    const id = `${objKey}.${fieldKey}`;
    const newDesc = (descEdits[id] ?? '').trim();
    const existing = customDescFor(objKey, fieldKey);
    setDescSaving(id);
    try {
      if (existing && !newDesc) {
        await axios.delete(`/api/dropdown-config?id=${existing.id}`);
      } else if (existing && newDesc !== (existing.parent_value || '')) {
        await axios.put(`/api/dropdown-config?id=${existing.id}`, { parent_value: newDesc });
      } else if (!existing && newDesc) {
        await axios.post('/api/dropdown-config', { field_name: 'field_description', value: id, parent_value: newDesc, sort_order: 0 });
      }
      setDescEdits(e => { const n = { ...e }; delete n[id]; return n; });
      loadDD();
    } catch (e) { alert(e.response?.data?.error || 'Failed to save'); }
    finally { setDescSaving(null); }
  };

  const handleDescReset = async (objKey, fieldKey) => {
    const existing = customDescFor(objKey, fieldKey);
    if (!existing) return;
    const id = `${objKey}.${fieldKey}`;
    setDescSaving(id);
    try {
      await axios.delete(`/api/dropdown-config?id=${existing.id}`);
      setDescEdits(e => { const n = { ...e }; delete n[id]; return n; });
      loadDD();
    } catch (e) { alert(e.response?.data?.error || 'Failed to reset'); }
    finally { setDescSaving(null); }
  };

  const handleRenameSave = async (objKey, fieldKey) => {
    const id = `${objKey}.${fieldKey}`;
    const newLabel = (renameEdits[id] ?? '').trim();
    const existing = customLabelFor(objKey, fieldKey);
    setRenameSaving(id);
    try {
      if (existing && !newLabel) {
        await axios.delete(`/api/dropdown-config?id=${existing.id}`);
      } else if (existing && newLabel !== existing.parent_value) {
        await axios.put(`/api/dropdown-config?id=${existing.id}`, { parent_value: newLabel });
      } else if (!existing && newLabel) {
        await axios.post('/api/dropdown-config', { field_name: 'field_label', value: id, parent_value: newLabel, sort_order: 0 });
      }
      setRenameEdits(e => { const n = { ...e }; delete n[id]; return n; });
      labelsReload();
    } catch (e) { alert(e.response?.data?.error || 'Failed to save'); }
    finally { setRenameSaving(null); }
  };

  const handleRenameReset = async (objKey, fieldKey) => {
    const existing = customLabelFor(objKey, fieldKey);
    if (!existing) return;
    const id = `${objKey}.${fieldKey}`;
    setRenameSaving(id);
    try {
      await axios.delete(`/api/dropdown-config?id=${existing.id}`);
      setRenameEdits(e => { const n = { ...e }; delete n[id]; return n; });
      labelsReload();
    } catch (e) { alert(e.response?.data?.error || 'Failed to reset'); }
    finally { setRenameSaving(null); }
  };

  const handleFrApproverSave = async () => {
    if (!frApprover) return;
    setFrApproverSaving(true);
    try {
      const existing = ddData.fr_default_approver?.[0];
      const selectedUser = users.find(u => String(u.id) === String(frApprover));
      if (!selectedUser) return;
      if (existing) {
        await axios.put(`/api/dropdown-config?id=${existing.id}`, { value: String(selectedUser.id), parent_value: selectedUser.name });
      } else {
        await axios.post('/api/dropdown-config', { field_name: 'fr_default_approver', value: String(selectedUser.id), parent_value: selectedUser.name, sort_order: 1 });
      }
      loadDD();
    } catch (e) { alert(e.response?.data?.error || 'Failed to save'); }
    finally { setFrApproverSaving(false); }
  };

  const handlePermSave = async () => {
    setPermSaving(true);
    try {
      const existing = ddData.role_permissions?.find(r => r.value === permRole);
      if (existing) {
        await axios.put(`/api/dropdown-config?id=${existing.id}`, { parent_value: JSON.stringify(permEdits) });
      } else {
        await axios.post('/api/dropdown-config', {
          field_name: 'role_permissions',
          value: permRole,
          parent_value: JSON.stringify(permEdits),
          sort_order: 0,
        });
      }
      loadDD();
      reloadPerms();
    } catch (e) { alert(e.response?.data?.error || 'Failed to save'); }
    finally { setPermSaving(false); }
  };

  // Map each settings tab to its org feature flag; tabs without a flag always show.
  const TAB_FEATURE = { permissions: 'permissions', ai: 'ai', api: 'api_access', fields: 'field_management', appearance: 'appearance' };
  const visibleNavItems = (user?.role === 'cx_strategy'
    ? NAV_ITEMS.filter(i => i.key === 'fields')
    : NAV_ITEMS
  ).filter(i => !TAB_FEATURE[i.key] || isEnabled(TAB_FEATURE[i.key]));

  const { roots, childrenMap } = buildTree(users);
  const currentDdItems = ddData[ddField] || [];
  const issueTypes = (ddData.issue_type || []).map(x => x.value);

  const ddSections = Object.entries(
    DD_FIELDS.reduce((acc, f) => { (acc[f.section] = acc[f.section] || []).push(f); return acc; }, {})
  );

  return (
    <div className="flex flex-col sm:flex-row gap-0 -mx-4 sm:-mx-6 -mt-5 sm:-mt-6 min-h-[calc(100vh-3.5rem)]">

      {/* ── Mobile tab bar ───────────────────────────────────────────── */}
      <div className="sm:hidden bg-white border-b border-gray-200 flex overflow-x-auto shrink-0">
        {visibleNavItems.map(item => (
          <button
            key={item.key}
            onClick={() => setSettingsPage(item.key)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition
              ${settingsPage === item.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <div className="hidden sm:flex w-56 shrink-0 bg-white border-r border-gray-100 flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <h1 className="text-base font-bold text-gray-900">Settings</h1>
          <p className="text-xs text-gray-400 mt-0.5">Admin controls</p>
        </div>
        <nav className="py-3 flex-1">
          {visibleNavItems.map(item => (
            <button
              key={item.key}
              onClick={() => setSettingsPage(item.key)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition text-left
                ${settingsPage === item.key
                  ? 'bg-brand-50 text-brand-700 border-r-2 border-brand-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 p-4 sm:p-6 space-y-6">

        {/* ── Manage Users page ─────────────────────────────────────── */}
        {settingsPage === 'users' && (
          <>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage Users</h2>
              <p className="text-sm text-gray-500 mt-0.5">Add, edit, and manage team members</p>
            </div>

            <div className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <p className="text-xs text-gray-400">{users.length} user{users.length !== 1 ? 's' : ''}</p>
                <div className="flex items-center gap-3">
                  {isEnabled('user_tree_view') && (
                  <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                    <button onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                      List
                    </button>
                    <button onClick={() => setViewMode('tree')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${viewMode === 'tree' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h1a2 2 0 012 2v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h1a2 2 0 012 2v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1zm8-8a2 2 0 012-2h1a2 2 0 012 2v1a2 2 0 01-2 2h-1a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h1a2 2 0 012 2v1a2 2 0 01-2 2h-1a2 2 0 01-2-2v-1z" /></svg>
                      Tree
                    </button>
                  </div>
                  )}
                  <button onClick={openAdd} className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add User
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-gray-400">Loading…</div>
              ) : users.length === 0 ? (
                <div className="py-12 text-center text-gray-400">No users found.</div>
              ) : viewMode === 'list' ? (
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[580px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Team</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CSM Display Name</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Seen</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-5 py-3 w-28"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => {
                      const active = u.is_active !== false;
                      return (
                      <tr key={u.id} className={`hover:bg-gray-50 transition ${active ? '' : 'bg-gray-50/60'}`}>
                        <td className="px-5 py-3 font-medium text-gray-900">
                          <span className={active ? '' : 'text-gray-400'}>{u.name}</span>{u.id === user?.id && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{u.email}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-600">{u.team || <span className="text-gray-300">—</span>}</td>
                        <td className="px-5 py-3 text-gray-600">{u.csm_name || <span className="text-gray-300">—</span>}</td>
                        <td className="px-5 py-3"><ActiveStatus at={u.last_active_at} /></td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => u.id !== user?.id && toggleActive(u)}
                            disabled={u.id === user?.id}
                            title={u.id === user?.id ? "You can't deactivate yourself" : (active ? 'Click to deactivate' : 'Click to activate')}
                            className="inline-flex items-center gap-2 disabled:cursor-not-allowed"
                          >
                            <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${active ? 'bg-brand-600' : 'bg-gray-300'} ${u.id === user?.id ? 'opacity-50' : ''}`}>
                              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${active ? 'left-[18px]' : 'left-0.5'}`} />
                            </span>
                            <span className={`text-xs font-medium ${active ? 'text-brand-700' : 'text-gray-400'}`}>{active ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded-md transition" title="Edit user">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            {u.id !== user?.id && (
                              <button onClick={() => { setReplaceFor(u); setReplaceWith(''); setReplaceDeactivate(true); }} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-md transition" title="Replace user (reassign everything to someone else)">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m4 6H4m0 0l4 4m-4-4l4-4" /></svg>
                              </button>
                            )}
                            {u.id !== user?.id && (
                              <button onClick={() => handleDelete(u)} disabled={deleting === u.id} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition disabled:opacity-50" title="Delete user">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex gap-16 justify-center py-8 px-6 min-w-max">
                    {roots.map(u => (
                      <OrgNode key={u.id} u={u} childrenMap={childrenMap} currentUserId={user?.id} onEdit={openEdit} onDelete={handleDelete} deleting={deleting} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Permissions page ──────────────────────────────────────── */}
        {settingsPage === 'permissions' && (
          <>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Role Permissions</h2>
              <p className="text-sm text-gray-500 mt-0.5">Configure what each role can view, create, edit, and delete</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {['csm', 'sales', 'product', 'cx_strategy', 'ps'].map(role => (
                <button key={role} onClick={() => setPermRole(role)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition ${
                    permRole === role
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}>
                  {role === 'cx_strategy' ? 'CX Strategy' : role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>

            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[540px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Object</th>
                      {PERM_ACTIONS.map(a => (
                        <th key={a.key} className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">{a.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {PERM_OBJECTS.map(obj => (
                      <tr key={obj.key} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3 font-medium text-gray-900">{obj.label}</td>
                        {PERM_ACTIONS.map(act => {
                          const checked = permEdits[obj.key]?.[act.key] !== false;
                          const isViewAction = act.key === 'view';
                          return (
                            <td key={act.key} className="px-5 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isViewAction}
                                onChange={() => {
                                  if (isViewAction) return;
                                  setPermEdits(prev => ({
                                    ...prev,
                                    [obj.key]: { ...(prev[obj.key] || {}), [act.key]: !checked }
                                  }));
                                }}
                                className="w-4 h-4 accent-brand-600 cursor-pointer disabled:cursor-default disabled:opacity-40"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400">View permission is always on. Admin always has full access.</p>
                <button onClick={handlePermSave} disabled={permSaving}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
                  {permSaving ? 'Saving…' : 'Save Permissions'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Feature Requests settings ─────────────────────────────── */}
        {settingsPage === 'feature-requests' && (
          <>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Feature Requests</h2>
              <p className="text-sm text-gray-500 mt-0.5">Configure approval workflow for feature requests</p>
            </div>
            <div className="card p-5 max-w-md">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Default Approver</h3>
              <p className="text-xs text-gray-500 mb-4">When a feature request is submitted, a review task is automatically created for this user.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Approver</label>
                  <select value={frApprover} onChange={e => setFrApprover(e.target.value)} className="w-full">
                    <option value="">— Select approver —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}{u.csm_name ? ` (${u.csm_name})` : ''}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleFrApproverSave}
                  disabled={frApproverSaving || !frApprover}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                >
                  {frApproverSaving ? 'Saving…' : 'Save'}
                </button>
                {ddData.fr_default_approver?.[0] && (
                  <p className="text-xs text-gray-400">
                    Current: <span className="font-medium text-gray-600">{ddData.fr_default_approver[0].parent_value}</span>
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── AI page ────────────────────────────────────────────────── */}
        {settingsPage === 'ai' && (
          <>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI (Bring Your Own Key)</h2>
              <p className="text-sm text-gray-500 mt-0.5">Choose a provider, paste your API key, and tune how each AI section analyzes data. AI buttons stay greyed out until the active provider has a key.</p>
            </div>

            {/* Provider + keys */}
            <div className="card space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Active Provider</label>
                <div className="flex flex-wrap gap-2">
                  {AI_PROVIDERS.map(([key, label]) => {
                    const active = aiForm.provider === key;
                    const hasKey = aiConfig?.providers?.[key];
                    return (
                      <button key={key} onClick={() => setAiForm(f => ({ ...f, provider: key }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition flex items-center gap-2
                          ${active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {label}
                        <span className={`w-1.5 h-1.5 rounded-full ${hasKey ? 'bg-green-500' : 'bg-gray-300'}`} title={hasKey ? 'Key set' : 'No key'} />
                      </button>
                    );
                  })}
                </div>
                {aiConfig && !aiConfig.enabled && (
                  <p className="text-xs text-amber-600 mt-2">The active provider has no key yet — AI features are disabled until you add one.</p>
                )}
              </div>

              <div className="space-y-3">
                {AI_PROVIDERS.map(([key, label]) => (
                  <div key={key} className="grid grid-cols-1 sm:grid-cols-[160px_1fr_140px] gap-2 items-center">
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      {label}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${aiConfig?.providers?.[key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {aiConfig?.providers?.[key] ? 'Key set' : 'No key'}
                      </span>
                    </div>
                    <input
                      type="password"
                      value={aiForm.keys[key] || ''}
                      onChange={e => setAiForm(f => ({ ...f, keys: { ...f.keys, [key]: e.target.value } }))}
                      placeholder={aiConfig?.providers?.[key] ? 'Enter new key to replace (leave blank to keep)' : 'Paste API key'}
                      className="w-full !py-1.5 text-sm font-mono"
                      autoComplete="off"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        value={aiForm.models[key] || ''}
                        onChange={e => setAiForm(f => ({ ...f, models: { ...f.models, [key]: e.target.value } }))}
                        placeholder="model (optional)"
                        className="w-full !py-1.5 text-xs"
                        title="Override the default model for this provider"
                      />
                      {aiConfig?.providers?.[key] && (
                        <button onClick={() => clearAiKey(key)} className="text-xs text-red-500 hover:text-red-700 shrink-0" title="Remove key">✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-section instructions */}
            <div className="card space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Section instructions</h3>
                <p className="text-xs text-gray-400 mt-0.5">Optional. Added on top of the built-in prompt for each AI section. Leave blank to use defaults.</p>
              </div>
              {AI_PROMPT_FIELDS.map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <textarea
                    rows={2}
                    value={aiForm.prompts[key] || ''}
                    onChange={e => setAiForm(f => ({ ...f, prompts: { ...f.prompts, [key]: e.target.value } }))}
                    placeholder={placeholder}
                    className="w-full resize-none text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={saveAi} disabled={aiSaving}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {aiSaving ? 'Saving…' : 'Save AI Settings'}
              </button>
              {aiMsg && <span className={`text-sm ${aiMsg === 'Saved' ? 'text-green-600' : 'text-red-600'}`}>{aiMsg}</span>}
            </div>
          </>
        )}

        {/* ── API Access page ────────────────────────────────────────── */}
        {settingsPage === 'api' && (
          <>
            <div>
              <h2 className="text-xl font-bold text-gray-900">API Access</h2>
              <p className="text-sm text-gray-500 mt-0.5">Open REST API for external systems to read, create and edit Accounts, Issues, Escalations and Tasks. Authenticate with an API key — no login session needed.</p>
            </div>

            {/* Keys */}
            <div className="card space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">API Keys</h3>
                <p className="text-xs text-gray-400 mt-0.5">Keys can read, create and edit records. They cannot delete records, manage users or change settings. Edits made via a key show as “API · &lt;label&gt;” in last-edited stamps.</p>
              </div>

              {/* Create */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={newKeyLabel}
                  onChange={e => { setNewKeyLabel(e.target.value); setKeyError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') createApiKey(); }}
                  placeholder='Key label, e.g. "LeadSquared sync"'
                  className="flex-1 text-sm"
                />
                <button onClick={createApiKey} disabled={creatingKey}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60 shrink-0">
                  {creatingKey ? 'Generating…' : 'Generate Key'}
                </button>
              </div>
              {keyError && <p className="text-xs text-red-600">{keyError}</p>}

              {/* One-time key reveal */}
              {createdKey && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
                  <p className="text-sm font-semibold text-green-800">Key created for “{createdKey.label}”</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-white border border-green-200 rounded-lg px-3 py-2 break-all select-all">{createdKey.key}</code>
                    <button onClick={() => copyText(createdKey.key, 'newkey')}
                      className="px-3 py-2 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition shrink-0">
                      {copiedTag === 'newkey' ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-green-700">Copy it now — for security it is stored hashed and <span className="font-semibold">cannot be shown again</span>.</p>
                  <button onClick={() => setCreatedKey(null)} className="text-xs text-green-700 hover:underline">Done, I’ve copied it</button>
                </div>
              )}

              {/* Key list */}
              {apiKeys.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No API keys yet. Generate one to start using the API.</p>
              ) : (
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                        <th className="py-2 pr-4 font-semibold">Label</th>
                        <th className="py-2 pr-4 font-semibold">Key</th>
                        <th className="py-2 pr-4 font-semibold">Created</th>
                        <th className="py-2 pr-4 font-semibold">Last used</th>
                        <th className="py-2 pr-4 font-semibold">Status</th>
                        <th className="py-2 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {apiKeys.map(k => (
                        <tr key={k.id}>
                          <td className="py-2.5 pr-4 font-medium text-gray-800">{k.label}</td>
                          <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">{k.key_prefix}</td>
                          <td className="py-2.5 pr-4 text-xs text-gray-500" title={fullTime(k.created_at)}>{timeAgo(k.created_at)}{k.created_by ? ` · ${k.created_by}` : ''}</td>
                          <td className="py-2.5 pr-4 text-xs text-gray-500" title={k.last_used_at ? fullTime(k.last_used_at) : ''}>{k.last_used_at ? timeAgo(k.last_used_at) : 'Never'}</td>
                          <td className="py-2.5 pr-4">
                            {k.revoked_at
                              ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Revoked</span>
                              : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>}
                          </td>
                          <td className="py-2.5 text-right whitespace-nowrap">
                            {k.revoked_at ? (
                              <button onClick={() => revokeApiKey(k, false)} className="text-xs text-brand-600 hover:underline mr-3">Restore</button>
                            ) : (
                              <button onClick={() => revokeApiKey(k, true)} className="text-xs text-amber-600 hover:underline mr-3">Revoke</button>
                            )}
                            <button onClick={() => deleteApiKey(k)} className="text-xs text-red-500 hover:underline">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Authentication */}
            <div className="card space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Authentication</h3>
              <p className="text-xs text-gray-500">All requests need an API key in the <code className="bg-gray-100 px-1 py-0.5 rounded">Authorization</code> header (or <code className="bg-gray-100 px-1 py-0.5 rounded">X-Api-Key</code>). Requests and responses are JSON.</p>
              <div className="space-y-1.5 text-xs font-mono bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto">
                <p><span className="text-gray-400"># Base URL</span></p>
                <p>{window.location.origin}</p>
                <p className="pt-2"><span className="text-gray-400"># Header</span></p>
                <p>Authorization: Bearer csmos_YOUR_KEY</p>
              </div>
            </div>

            {/* Endpoint reference */}
            {API_DOCS.map(group => (
              <div key={group.entity} className="card space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">{group.entity}</h3>
                <div className="space-y-2">
                  {group.endpoints.map(([method, path, desc]) => (
                    <div key={method + path} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${API_METHOD_BADGE[method]}`}>{method}</span>
                        <code className="text-xs font-mono text-gray-800">{path}</code>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <pre className="text-[11px] font-mono bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto whitespace-pre">{group.example.replaceAll('{BASE}', window.location.origin)}</pre>
                  <button
                    onClick={() => copyText(group.example.replaceAll('{BASE}', window.location.origin), group.entity)}
                    className="absolute top-2 right-2 px-2 py-1 text-[10px] font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition">
                    {copiedTag === group.entity ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}

            <div className="card bg-amber-50/60 border-amber-100">
              <p className="text-xs text-amber-800 leading-relaxed">
                <span className="font-semibold">Notes:</span> dates use <code className="bg-amber-100 px-1 rounded">YYYY-MM-DD</code> (task due dates use ISO datetime). API keys see all records (no CSM filtering), cannot delete anything, and every write is stamped with the key’s label for auditing. Run <code className="bg-amber-100 px-1 rounded">supabase/migrate_api_keys.sql</code> once before generating keys.
              </p>
            </div>
          </>
        )}

        {/* ── Field Management page ──────────────────────────────────── */}
        {settingsPage === 'fields' && (
          <>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Field Management</h2>
              <p className="text-sm text-gray-500 mt-0.5">Manage dropdown values and rename fields across all objects</p>
            </div>

            {/* Sub-tab: Dropdown Values | Rename Fields */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 w-fit">
              {(user?.role === 'cx_strategy' ? [['dropdowns', 'Dropdown Values']] : [['dropdowns', 'Dropdown Values'], ['rename', 'Rename Fields']]).map(([k, lbl]) => (
                <button key={k} onClick={() => setFieldsTab(k)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${fieldsTab === k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  {lbl}
                </button>
              ))}
            </div>

            {/* ── Rename Fields ── */}
            {fieldsTab === 'rename' && (
              <div className="card p-0 overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50 overflow-x-auto">
                  <div className="flex min-w-max">
                    {Object.entries(FIELD_CATALOG).map(([objKey, obj]) => (
                      <button key={objKey}
                        onClick={() => { setRenameObj(objKey); setRenameEdits({}); setDescEdits({}); }}
                        className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition
                          ${renameObj === objKey ? 'border-brand-600 text-brand-700 font-semibold bg-white' : 'border-transparent text-gray-600 hover:text-gray-800'}`}>
                        {obj.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-xs text-gray-400 mb-3">Renamed fields show their new label in tables, column pickers, and reports. Leave blank and save to restore the default.</p>
                  {FIELD_CATALOG[renameObj].fields.map(f => {
                    const id = `${renameObj}.${f.key}`;
                    const existingLabel = customLabelFor(renameObj, f.key);
                    const existingDesc  = customDescFor(renameObj, f.key);
                    const labelVal  = renameEdits[id] !== undefined ? renameEdits[id] : (existingLabel?.parent_value || '');
                    const labelDirty = renameEdits[id] !== undefined && renameEdits[id].trim() !== (existingLabel?.parent_value || '');
                    const descVal   = descEdits[id]   !== undefined ? descEdits[id]   : (existingDesc?.parent_value  || '');
                    const descDirty  = descEdits[id]   !== undefined && descEdits[id].trim()   !== (existingDesc?.parent_value  || '');
                    return (
                      <div key={f.key} className="px-3 py-3 rounded-lg hover:bg-gray-50 group border-b border-gray-50 last:border-0">
                        <div className="flex items-start gap-3">
                          <span className="w-48 shrink-0 text-sm text-gray-600 font-medium pt-1.5 truncate" title={f.key}>{f.label}</span>
                          <div className="flex-1 space-y-2">
                            {/* Label rename */}
                            <div className="flex items-center gap-2">
                              <input
                                value={labelVal}
                                onChange={e => setRenameEdits(prev => ({ ...prev, [id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter' && labelDirty) handleRenameSave(renameObj, f.key); }}
                                placeholder={f.label}
                                className="flex-1 !py-1.5 text-sm"
                              />
                              <div className="flex items-center gap-1 shrink-0">
                                {labelDirty && (
                                  <button onClick={() => handleRenameSave(renameObj, f.key)} disabled={renameSaving === id}
                                    className="text-xs px-2.5 py-1 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition disabled:opacity-50">
                                    {renameSaving === id ? '…' : 'Save'}
                                  </button>
                                )}
                                {existingLabel && !labelDirty && (
                                  <button onClick={() => handleRenameReset(renameObj, f.key)} disabled={renameSaving === id}
                                    className="text-xs px-2 py-1 text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                    {renameSaving === id ? '…' : 'Reset'}
                                  </button>
                                )}
                                {existingLabel && !labelDirty && (
                                  <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" title="Custom label active" />
                                )}
                              </div>
                            </div>
                            {/* Field description */}
                            <div className="flex items-start gap-2">
                              <textarea
                                value={descVal}
                                onChange={e => setDescEdits(prev => ({ ...prev, [id]: e.target.value }))}
                                placeholder="Add a description for this field (shown as a tooltip to users)…"
                                rows={2}
                                className="flex-1 !py-1.5 text-xs text-gray-600 resize-none"
                              />
                              <div className="flex items-center gap-1 shrink-0 pt-1">
                                {descDirty && (
                                  <button onClick={() => handleDescSave(renameObj, f.key)} disabled={descSaving === id}
                                    className="text-xs px-2.5 py-1 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition disabled:opacity-50">
                                    {descSaving === id ? '…' : 'Save'}
                                  </button>
                                )}
                                {existingDesc && !descDirty && (
                                  <button onClick={() => handleDescReset(renameObj, f.key)} disabled={descSaving === id}
                                    className="text-xs px-2 py-1 text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                    {descSaving === id ? '…' : 'Clear'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {fieldsTab === 'dropdowns' && (
            <div className="card p-0 overflow-hidden">
              {/* Mobile: horizontal scrollable tab bar */}
              <div className="sm:hidden border-b border-gray-100 bg-gray-50 overflow-x-auto">
                <div className="flex min-w-max">
                  {ddSections.flatMap(([, fields]) => fields).map(f => (
                    <button
                      key={f.key}
                      onClick={() => { setDdField(f.key); setDdEditId(null); setDdAddValue(''); setDdAddParent(''); }}
                      className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition
                        ${ddField === f.key ? 'border-brand-600 text-brand-700 font-semibold bg-white' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row" style={{ minHeight: 420 }}>
                {/* Desktop: left field selector sidebar */}
                <div className="hidden sm:block w-52 shrink-0 border-r border-gray-100 bg-gray-50 overflow-y-auto">
                  {ddSections.map(([section, fields]) => (
                    <div key={section}>
                      <p className="px-4 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-widest">{section}</p>
                      {fields.map(f => (
                        <button
                          key={f.key}
                          onClick={() => { setDdField(f.key); setDdEditId(null); setDdAddValue(''); setDdAddParent(''); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition border-b border-gray-100 last:border-0
                            ${ddField === f.key ? 'bg-white font-semibold text-brand-700 border-r-2 border-brand-600' : 'text-gray-600 hover:bg-white'}`}
                        >
                          {f.label}
                          <span className="ml-1 text-xs font-normal text-gray-400">({(ddData[f.key] || []).length})</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Right: values panel */}
                <div className="flex-1 p-4 space-y-3 min-w-0">
                  {ddLoading ? (
                    <div className="text-sm text-gray-400">Loading…</div>
                  ) : (
                    <>
                      {/* Add new value */}
                      <div className="flex items-center gap-2">
                        {ddField === 'issue_sub_type' && (
                          <select
                            value={ddAddParent}
                            onChange={e => setDdAddParent(e.target.value)}
                            className="!w-44 !py-1.5 text-sm shrink-0"
                          >
                            <option value="">— Parent Type —</option>
                            {issueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        )}
                        <input
                          value={ddAddValue}
                          onChange={e => setDdAddValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleDdAdd()}
                          placeholder={`Add new ${DD_FIELDS.find(f => f.key === ddField)?.label} value…`}
                          className="flex-1 !py-1.5 text-sm"
                        />
                        <button
                          onClick={handleDdAdd}
                          disabled={ddAdding || !ddAddValue.trim() || (ddField === 'issue_sub_type' && !ddAddParent)}
                          className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 shrink-0"
                        >
                          {ddAdding ? '…' : '+ Add'}
                        </button>
                      </div>

                      {/* Values list */}
                      {currentDdItems.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No values yet.</p>
                      ) : ddField === 'issue_sub_type' ? (
                        <div className="space-y-3">
                          {issueTypes.map(parent => {
                            const items = currentDdItems.filter(x => x.parent_value === parent);
                            if (!items.length) return null;
                            return (
                              <div key={parent}>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{parent}</p>
                                <div className="space-y-1">
                                  {items.map(item => (
                                    <DdRow key={item.id} item={item} isEditing={ddEditId === item.id}
                                      editValue={ddEditValue} editParent={ddEditParent} showParent issueTypes={issueTypes}
                                      onStartEdit={() => startDdEdit(item)} onCancelEdit={() => setDdEditId(null)}
                                      onSaveEdit={() => handleDdEdit(item.id)} onDelete={() => handleDdDelete(item.id, item.value)}
                                      onChangeValue={setDdEditValue} onChangeParent={setDdEditParent} saving={ddSaving} />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          {currentDdItems.filter(x => !issueTypes.includes(x.parent_value)).map(item => (
                            <DdRow key={item.id} item={item} isEditing={ddEditId === item.id}
                              editValue={ddEditValue} editParent={ddEditParent} showParent issueTypes={issueTypes}
                              onStartEdit={() => startDdEdit(item)} onCancelEdit={() => setDdEditId(null)}
                              onSaveEdit={() => handleDdEdit(item.id)} onDelete={() => handleDdDelete(item.id, item.value)}
                              onChangeValue={setDdEditValue} onChangeParent={setDdEditParent} saving={ddSaving} />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {currentDdItems.map((item, idx) => (
                            <DdRow key={item.id} item={item} isEditing={ddEditId === item.id}
                              editValue={ddEditValue} onStartEdit={() => startDdEdit(item)}
                              onCancelEdit={() => setDdEditId(null)} onSaveEdit={() => handleDdEdit(item.id)}
                              onDelete={() => handleDdDelete(item.id, item.value)}
                              onChangeValue={setDdEditValue} saving={ddSaving}
                              isFirst={idx === 0} isLast={idx === currentDdItems.length - 1}
                              onReorderUp={() => handleDdReorder(item, 'up')}
                              onReorderDown={() => handleDdReorder(item, 'down')} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            )}
          </>
        )}

        {/* ── Appearance page ───────────────────────────────────────── */}
        {settingsPage === 'appearance' && user?.role === 'admin' && (() => {
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
          const isValidHex = h => /^#[0-9a-fA-F]{6}$/.test(h.trim());

          const handlePreset = (hex) => {
            setThemeColor(hex);
            setHexInput(hex);
            applyTheme(hex);
          };

          const handleHexChange = (val) => {
            setHexInput(val);
            const v = val.trim();
            if (isValidHex(v)) {
              setThemeColor(v);
              applyTheme(v);
            }
          };

          const handleColorPicker = (e) => {
            const v = e.target.value;
            setHexInput(v);
            setThemeColor(v);
            applyTheme(v);
          };

          const handleReset = () => {
            setThemeColor('');
            setHexInput('');
            applyTheme(null);
          };

          const handleSaveTheme = async () => {
            setThemeSaving(true); setThemeMsg('');
            try {
              const val = isValidHex(themeColor) ? themeColor : null;
              await axios.put('/api/admin/users?resource=org_settings', { theme_color: val });
              applyTheme(val);
              setThemeColor(val || '');
              setHexInput(val || '');
              setThemeMsg('Saved!');
              setTimeout(() => setThemeMsg(''), 2500);
            } catch (e) {
              setThemeMsg(e.response?.data?.error || 'Failed to save');
            } finally { setThemeSaving(false); }
          };

          const scale = isValidHex(themeColor) ? generateScale(themeColor) : null;

          return (
            <>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Appearance</h2>
                <p className="text-sm text-gray-500 mt-0.5">Customise the brand color used across the app</p>
              </div>

              {/* Presets */}
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Color Presets</h3>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {PRESETS.map(p => (
                    <button
                      key={p.hex}
                      title={p.label}
                      onClick={() => handlePreset(p.hex)}
                      className={`group flex flex-col items-center gap-1.5 focus:outline-none`}
                    >
                      <span
                        className={`w-10 h-10 rounded-full border-2 transition-transform group-hover:scale-110 ${themeColor === p.hex ? 'border-gray-800 scale-110' : 'border-white shadow-md'}`}
                        style={{ backgroundColor: p.hex }}
                      />
                      <span className="text-[10px] text-gray-500 text-center leading-tight">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom hex + picker */}
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Custom Color</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={isValidHex(themeColor) ? themeColor : '#0ea47e'}
                    onChange={handleColorPicker}
                    className="!w-12 !h-12 !p-0.5 !rounded-xl !border-gray-200 cursor-pointer"
                    title="Pick a color"
                  />
                  <input
                    value={hexInput}
                    onChange={e => handleHexChange(e.target.value)}
                    placeholder="#0ea47e"
                    className="w-36 font-mono text-sm"
                    maxLength={7}
                  />
                  {themeColor && (
                    <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-600 transition">
                      Reset to default
                    </button>
                  )}
                </div>
                {hexInput && !isValidHex(hexInput) && (
                  <p className="text-xs text-red-500">Enter a valid 6-digit hex color (e.g. #4f46e5)</p>
                )}
              </div>

              {/* Shade scale preview */}
              {scale && (
                <div className="card p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Color Scale Preview</h3>
                  <div className="flex gap-1.5 flex-wrap">
                    {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(stop => {
                      const [r, g, b] = scale[stop] || [0, 0, 0];
                      const hex = scaleToHex([r, g, b]);
                      const isDark = (r * 299 + g * 587 + b * 114) / 1000 < 128;
                      return (
                        <div key={stop} className="flex flex-col items-center gap-1">
                          <div
                            className="w-10 h-10 rounded-lg shadow-sm"
                            style={{ backgroundColor: hex }}
                          />
                          <span className={`text-[10px] font-mono`} style={{ color: stop >= 700 ? '#374151' : '#6b7280' }}>{stop}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* UI preview */}
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Live Preview</h3>
                <div className="flex flex-wrap gap-3 items-center">
                  <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition">
                    Primary button
                  </button>
                  <button className="px-4 py-2 bg-brand-100 hover:bg-brand-200 text-brand-700 text-sm font-medium rounded-lg transition">
                    Secondary button
                  </button>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
                    Badge
                  </span>
                  <a href="#" onClick={e => e.preventDefault()} className="text-sm text-brand-600 hover:text-brand-700 font-medium underline">
                    Link text
                  </a>
                  <div className="w-32 h-1.5 rounded-full bg-brand-200 overflow-hidden">
                    <div className="h-full w-2/3 bg-brand-600 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveTheme}
                  disabled={themeSaving || (!themeColor && !isValidHex(hexInput))}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
                >
                  {themeSaving ? 'Saving…' : 'Save theme'}
                </button>
                {themeMsg && (
                  <span className={`text-sm font-medium ${themeMsg === 'Saved!' ? 'text-green-600' : 'text-red-600'}`}>
                    {themeMsg}
                  </span>
                )}
              </div>
            </>
          );
        })()}

      </div>

      {/* ── Replace User Modal ────────────────────────────────────────── */}
      {replaceFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Replace user</h3>
              <button onClick={() => setReplaceFor(null)} className="text-gray-400 hover:text-gray-600 transition">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Reassign every account, issue, escalation, task and feature request owned by{' '}
                <b className="text-gray-900">{replaceFor.name}</b> to another user.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reassign everything to *</label>
                <select value={replaceWith} onChange={e => setReplaceWith(e.target.value)}>
                  <option value="">Select a user…</option>
                  {users.filter(u => u.id !== replaceFor.id).map(u => (
                    <option key={u.id} value={u.id}>{u.name}{u.csm_name ? ` (${u.csm_name})` : ''}{u.is_active === false ? ' — inactive' : ''}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={replaceDeactivate} onChange={e => setReplaceDeactivate(e.target.checked)} className="!w-4 !h-4" />
                <span className="text-sm text-gray-700">Deactivate <b>{replaceFor.name}</b> after reassigning</span>
              </label>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                This rewrites ownership across all objects and can't be automatically undone. CSM-tagged
                records move by display name; tasks &amp; feature requests move by their stored owner.
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setReplaceFor(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
              <button onClick={handleReplace} disabled={!replaceWith || replacing} className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition disabled:opacity-50">
                {replacing ? 'Replacing…' : 'Replace user'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit User Modal ───────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">{editUser ? 'Edit User' : 'Add User'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Anindya Roy" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="user@company.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Password {editUser ? <span className="text-gray-400 font-normal">(leave blank to keep current)</span> : '*'}
                </label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder={editUser ? 'New password (optional)' : 'Set password'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <SelectDropdown
                  clearable={false}
                  value={form.role}
                  onChange={v => setForm(f => ({...f, role: v}))}
                  options={[
                    { value: 'csm', label: 'CSM' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'sales', label: 'Sales' },
                    { value: 'product', label: 'Product' },
                    { value: 'cx_strategy', label: 'CX Strategy' },
                    { value: 'ps', label: 'PS' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team</label>
                <SelectDropdown
                  value={form.team}
                  onChange={v => setForm(f => ({...f, team: v ?? ''}))}
                  placeholder="— Select Team —"
                  options={TEAM_OPTIONS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CSM Display Name <span className="text-gray-400 font-normal">(shown in account CSM field)</span></label>
                <input value={form.csm_name} onChange={e => setForm(f => ({...f, csm_name: e.target.value}))} placeholder="e.g. Amarjeet" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CSM Lead <span className="text-gray-400 font-normal">(manager / lead for this CSM)</span></label>
                <SelectDropdown
                  value={form.csm_lead}
                  onChange={v => setForm(f => ({...f, csm_lead: v ?? ''}))}
                  placeholder="— Select CSM Lead —"
                  options={[...new Set(users.filter(u => u.csm_name).map(u => u.csm_name))].sort()}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DdRow({ item, isEditing, editValue, editParent, showParent, issueTypes = [], onStartEdit, onCancelEdit, onSaveEdit, onDelete, onChangeValue, onChangeParent, saving, isFirst, isLast, onReorderUp, onReorderDown }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 group border border-transparent hover:border-gray-100">
      {isEditing ? (
        <>
          {showParent && (
            <select value={editParent || ''} onChange={e => onChangeParent(e.target.value)} className="!w-36 !py-1 text-xs shrink-0">
              <option value="">— Parent —</option>
              {issueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <input value={editValue} onChange={e => onChangeValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit(); }} className="flex-1 !py-1 text-sm" autoFocus />
          <button onClick={onSaveEdit} disabled={saving || !editValue.trim()} className="text-xs px-2 py-1 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition disabled:opacity-50 shrink-0">Save</button>
          <button onClick={onCancelEdit} className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 transition shrink-0">Cancel</button>
        </>
      ) : (
        <>
          {onReorderUp && (
            <div className="flex flex-col gap-0 shrink-0 opacity-0 group-hover:opacity-100 transition">
              <button onClick={onReorderUp} disabled={isFirst} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 transition leading-none" title="Move up">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
              </button>
              <button onClick={onReorderDown} disabled={isLast} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 transition leading-none" title="Move down">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
          )}
          <span className="flex-1 text-sm text-gray-800">{item.value}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
            <button onClick={onStartEdit} className="p-1 text-gray-400 hover:text-brand-600 rounded transition" title="Edit">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 rounded transition" title="Delete">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
