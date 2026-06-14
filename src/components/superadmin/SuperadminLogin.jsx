import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuperadminAuth } from '../../context/SuperadminAuthContext';

export default function SuperadminLogin() {
  const { login } = useSuperadminAuth();
  const navigate   = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email, password);
      navigate('/superadmin');
    } catch (err) {
      setError(err?.response?.data?.error || 'Invalid credentials');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <svg viewBox="0 0 64 64" className="w-16 h-16">
              <defs>
                <linearGradient id="sa-login-g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#0EA47E" />
                  <stop offset="1" stopColor="#2DD4A7" />
                </linearGradient>
              </defs>
              <path d="M47 20 A18 18 0 1 0 47 44" fill="none" stroke="url(#sa-login-g)" strokeWidth="10" strokeLinecap="round" />
              <polygon points="49,24.5 51.55,29.45 56.5,32 51.55,34.55 49,39.5 46.45,34.55 41.5,32 46.45,29.45" fill="#2DD4A7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Cust<span className="text-brand-400">ally</span></h1>
          <p className="text-gray-400 text-sm mt-1">Superadmin · Platform access only</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-gray-600"
              placeholder="admin@yourdomain.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
