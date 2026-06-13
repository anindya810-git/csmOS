import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function CustallyLogo() {
  return (
    <svg viewBox="0 0 64 64" width="42" height="42">
      <defs>
        <linearGradient id="login-lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0EA47E" />
          <stop offset="1" stopColor="#2DD4A7" />
        </linearGradient>
      </defs>
      <path d="M47 20 A18 18 0 1 0 47 44" fill="none" stroke="url(#login-lg)" strokeWidth="10" strokeLinecap="round" />
      <polygon points="49,24.5 51.55,29.45 56.5,32 51.55,34.55 49,39.5 46.45,34.55 41.5,32 46.45,29.45" fill="#2DD4A7" />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/accounts');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-brand-900 p-10 text-white">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <CustallyLogo />
            <span className="font-bold text-2xl tracking-tight">
              Cust<span className="text-brand-300">ally</span>
            </span>
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-4">Customer experience, simplified.</h2>
          <p className="text-white/60 text-base leading-relaxed">
            One platform for escalations, issues, feature requests, renewals, and reporting — with AI built into all of it.
          </p>
        </div>
        <div className="space-y-4">
          {[
            'Real-time portfolio health at a glance',
            'No-code custom reports in minutes',
            'AI that spots the risk before it turns red',
          ].map(f => (
            <div key={f} className="flex items-center gap-3 text-sm text-white/70">
              <div className="w-5 h-5 rounded-full bg-brand-500/30 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <CustallyLogo />
          <span className="font-bold text-2xl tracking-tight text-gray-900">
            Cust<span className="text-brand-600">ally</span>
          </span>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-8">Sign in to your Custally account</p>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition disabled:opacity-60 mt-1"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-xs text-gray-400 text-center">
            Contact your admin if you've forgotten your password.
          </p>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <Link to="/" className="text-sm text-brand-700 hover:text-brand-900 font-medium transition">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
