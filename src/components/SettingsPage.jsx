import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FIELD_CATALOG } from '../fieldCatalog';
import { useFieldLabels } from '../context/FieldLabelsContext';
import { usePermissions, getDefaultPermsForRole, PERM_OBJECTS, PERM_ACTIONS } from '../context/PermissionsContext';
import { useAiConfig } from '../context/AiConfigContext';
import { timeAgo, fullTime } from './LastEdited';

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
];

const AI_PROVIDERS = [
  ['anthropic', 'Anthropic (Claude)'],
  ['openai',    'OpenAI (GPT)'],
  ['gemini',    'Google Gemini'],
];

const AI_PROMPT_FIELDS = [
  ['account_summary', 'Account Summary', 'How to summarize an account (≤200 words).'],
  ['account_esc_iss', 'Account — Escalations & Issues', 'How to summarize an account\'s escalations & issues.'],
  ['feature_request', 'Feature Request Recommendation', 'How to recommend take-up, priority and ETA from linked data.'],
  ['rag',             'RAG Report Analysis', 'How to analyze each RAG band (Red/Amber/Green).'],
  ['issues_overview', 'Issues & Escalations Overview', 'How to summarize the filtered issues & escalations in view.'],
  ['next_steps',      'Issue / Escalation Next Steps', 'How to recommend next steps for a single issue or escalation.'],
];

export default function SettingsPage() {
  const { user } = useAuth();
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

  // Field renaming
  const { rows: labelRows, reload: labelsReload } = useFieldLabels();
  const [fieldsTab,    setFieldsTab]    = useState('dropdowns'); // dropdowns | rename
  const [renameObj,    setRenameObj]    = useState('accounts');
  const [renameEdits,  setRenameEdits]  = useState({});
  const [renameSaving, setRenameSaving] = useState(null);

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

  const visibleNavItems = user?.role === 'cx_strategy'
    ? NAV_ITEMS.filter(i => i.key === 'fields')
    : NAV_ITEMS;

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
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Active</th>
                      <th className="px-5 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {u.name}{u.id === user?.id && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{u.email}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-600">{u.team || <span className="text-gray-300">—</span>}</td>
                        <td className="px-5 py-3 text-gray-600">{u.csm_name || <span className="text-gray-300">—</span>}</td>
                        <td className="px-5 py-3"><ActiveStatus at={u.last_active_at} /></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded-md transition" title="Edit user">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            {u.id !== user?.id && (
                              <button onClick={() => handleDelete(u)} disabled={deleting === u.id} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition disabled:opacity-50" title="Delete user">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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
                        onClick={() => { setRenameObj(objKey); setRenameEdits({}); }}
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
                    const existing = customLabelFor(renameObj, f.key);
                    const editVal = renameEdits[id] !== undefined ? renameEdits[id] : (existing?.parent_value || '');
                    const dirty = renameEdits[id] !== undefined && renameEdits[id].trim() !== (existing?.parent_value || '');
                    return (
                      <div key={f.key} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 group">
                        <span className="w-48 shrink-0 text-sm text-gray-500 truncate" title={f.key}>{f.label}</span>
                        <input
                          value={editVal}
                          onChange={e => setRenameEdits(prev => ({ ...prev, [id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter' && dirty) handleRenameSave(renameObj, f.key); }}
                          placeholder={f.label}
                          className="flex-1 !py-1.5 text-sm"
                        />
                        <div className="flex items-center gap-1 shrink-0 w-28 justify-end">
                          {dirty && (
                            <button onClick={() => handleRenameSave(renameObj, f.key)} disabled={renameSaving === id}
                              className="text-xs px-2.5 py-1 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition disabled:opacity-50">
                              {renameSaving === id ? '…' : 'Save'}
                            </button>
                          )}
                          {existing && !dirty && (
                            <button onClick={() => handleRenameReset(renameObj, f.key)} disabled={renameSaving === id}
                              className="text-xs px-2 py-1 text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                              {renameSaving === id ? '…' : 'Reset'}
                            </button>
                          )}
                          {existing && !dirty && (
                            <span className="w-2 h-2 rounded-full bg-brand-500" title="Custom label active" />
                          )}
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
      </div>

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
                <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                  <option value="csm">CSM</option>
                  <option value="admin">Admin</option>
                  <option value="sales">Sales</option>
                  <option value="product">Product</option>
                  <option value="cx_strategy">CX Strategy</option>
                  <option value="ps">PS</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team</label>
                <select value={form.team} onChange={e => setForm(f => ({...f, team: e.target.value}))}>
                  <option value="">— Select Team —</option>
                  {TEAM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CSM Display Name <span className="text-gray-400 font-normal">(shown in account CSM field)</span></label>
                <input value={form.csm_name} onChange={e => setForm(f => ({...f, csm_name: e.target.value}))} placeholder="e.g. Amarjeet" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CSM Lead <span className="text-gray-400 font-normal">(manager / lead for this CSM)</span></label>
                <select value={form.csm_lead} onChange={e => setForm(f => ({...f, csm_lead: e.target.value}))} className="w-full">
                  <option value="">— Select CSM Lead —</option>
                  {[...new Set(users.filter(u => u.csm_name).map(u => u.csm_name))].sort().map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
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
