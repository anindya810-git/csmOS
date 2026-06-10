import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ROLE_BADGE = {
  admin: 'bg-brand-100 text-brand-700',
  csm:   'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'csm', csm_name: '' };

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    load();
  }, [user]);

  const load = () => {
    setLoading(true);
    axios.get('/api/admin/users')
      .then(r => setUsers(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const openAdd = () => {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, csm_name: u.csm_name || '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) { setError('Name and email are required'); return; }
    if (!editUser && !form.password) { setError('Password is required for new users'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { name: form.name, email: form.email, role: form.role, csm_name: form.csm_name };
      if (form.password) payload.password = form.password;
      if (editUser) {
        await axios.put(`/api/admin/users/${editUser.id}`, payload);
      } else {
        await axios.post('/api/admin/users', { ...payload, password: form.password });
      }
      setShowModal(false);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    setDeleting(u.id);
    try {
      await axios.delete(`/api/admin/users/${u.id}`);
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage users and CSMs</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Users & CSMs</h2>
            <p className="text-xs text-gray-400 mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add User
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No users found.</div>
        ) : (
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
                    {u.name}
                    {u.id === user?.id && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{u.csm_name || <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded-md transition"
                        title="Edit user"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={deleting === u.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition disabled:opacity-50"
                          title="Delete user"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  CSM Display Name <span className="text-gray-400 font-normal">(shown in account CSM field)</span>
                </label>
                <input value={form.csm_name} onChange={e => setForm(f => ({...f, csm_name: e.target.value}))} placeholder="e.g. Amarjeet" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
