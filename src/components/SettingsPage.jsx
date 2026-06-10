import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ROLE_BADGE = {
  admin: 'bg-brand-100 text-brand-700',
  csm:   'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'csm', csm_name: '', csm_lead: '' };

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

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
  const [ddField,     setDdField]     = useState('trigger_reason');
  const [ddAddValue,  setDdAddValue]  = useState('');
  const [ddAddParent, setDdAddParent] = useState('');
  const [ddAdding,    setDdAdding]    = useState(false);
  const [ddEditId,    setDdEditId]    = useState(null);
  const [ddEditValue, setDdEditValue] = useState('');
  const [ddEditParent,setDdEditParent]= useState('');
  const [ddSaving,    setDdSaving]    = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    loadUsers();
    loadDD();
  }, [user]);

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
    setForm({ name: u.name, email: u.email, password: '', role: u.role, csm_name: u.csm_name || '', csm_lead: u.csm_lead || '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) { setError('Name and email are required'); return; }
    if (!editUser && !form.password) { setError('Password is required for new users'); return; }
    setSaving(true); setError('');
    try {
      const payload = { name: form.name, email: form.email, role: form.role, csm_name: form.csm_name, csm_lead: form.csm_lead };
      if (form.password) payload.password = form.password;
      if (editUser) await axios.put(`/api/admin/users/${editUser.id}`, payload);
      else await axios.post('/api/admin/users', { ...payload, password: form.password });
      setShowModal(false); loadUsers();
    } catch (e) { setError(e.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    setDeleting(u.id);
    try { await axios.delete(`/api/admin/users/${u.id}`); loadUsers(); }
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

  const { roots, childrenMap } = buildTree(users);
  const currentDdItems = ddData[ddField] || [];
  const issueTypes = (ddData.issue_type || []).map(x => x.value);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage users, CSMs and dropdown fields</p>
      </div>

      {/* ── Users & CSMs ─────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Users & CSMs</h2>
            <p className="text-xs text-gray-400 mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''}</p>
          </div>
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
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CSM Display Name</th>
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
                  <td className="px-5 py-3 text-gray-600">{u.csm_name || <span className="text-gray-300">—</span>}</td>
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

      {/* ── Dropdown Fields ──────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Dropdown Fields</h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage values for escalation dropdown fields</p>
        </div>
        <div className="flex min-h-[320px]">
          {/* Left: field selector */}
          <div className="w-52 shrink-0 border-r border-gray-100 bg-gray-50 overflow-y-auto">
            {Object.entries(DD_FIELDS.reduce((acc, f) => { (acc[f.section] = acc[f.section] || []).push(f); return acc; }, {})).map(([section, fields]) => (
              <div key={section}>
                <p className="px-4 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-widest">{section}</p>
                {fields.map(f => (
                  <button
                    key={f.key}
                    onClick={() => { setDdField(f.key); setDdEditId(null); setDdAddValue(''); setDdAddParent(''); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition border-b border-gray-100 last:border-0 ${ddField === f.key ? 'bg-white font-semibold text-brand-700 border-r-2 border-brand-600' : 'text-gray-600 hover:bg-white'}`}
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
                  /* Grouped by parent for issue_sub_type */
                  <div className="space-y-3">
                    {issueTypes.map(parent => {
                      const items = currentDdItems.filter(x => x.parent_value === parent);
                      if (!items.length) return null;
                      return (
                        <div key={parent}>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{parent}</p>
                          <div className="space-y-1">
                            {items.map(item => (
                              <DdRow
                                key={item.id}
                                item={item}
                                isEditing={ddEditId === item.id}
                                editValue={ddEditValue}
                                editParent={ddEditParent}
                                showParent={true}
                                issueTypes={issueTypes}
                                onStartEdit={() => startDdEdit(item)}
                                onCancelEdit={() => setDdEditId(null)}
                                onSaveEdit={() => handleDdEdit(item.id)}
                                onDelete={() => handleDdDelete(item.id, item.value)}
                                onChangeValue={setDdEditValue}
                                onChangeParent={setDdEditParent}
                                saving={ddSaving}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {/* Sub-types with no matching parent */}
                    {currentDdItems.filter(x => !issueTypes.includes(x.parent_value)).map(item => (
                      <DdRow key={item.id} item={item} isEditing={ddEditId === item.id} editValue={ddEditValue} editParent={ddEditParent} showParent issueTypes={issueTypes}
                        onStartEdit={() => startDdEdit(item)} onCancelEdit={() => setDdEditId(null)} onSaveEdit={() => handleDdEdit(item.id)}
                        onDelete={() => handleDdDelete(item.id, item.value)} onChangeValue={setDdEditValue} onChangeParent={setDdEditParent} saving={ddSaving} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {currentDdItems.map(item => (
                      <DdRow
                        key={item.id}
                        item={item}
                        isEditing={ddEditId === item.id}
                        editValue={ddEditValue}
                        onStartEdit={() => startDdEdit(item)}
                        onCancelEdit={() => setDdEditId(null)}
                        onSaveEdit={() => handleDdEdit(item.id)}
                        onDelete={() => handleDdDelete(item.id, item.value)}
                        onChangeValue={setDdEditValue}
                        saving={ddSaving}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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

function DdRow({ item, isEditing, editValue, editParent, showParent, issueTypes = [], onStartEdit, onCancelEdit, onSaveEdit, onDelete, onChangeValue, onChangeParent, saving }) {
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
