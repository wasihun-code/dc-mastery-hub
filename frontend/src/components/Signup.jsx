import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function Signup({ onSignupSuccess, onNavigateToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        onSignupSuccess();
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black p-4 select-none">
      {/* Dynamic Animated Ambient Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[var(--accent-green)]/20 rounded-full blur-[140px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-purple-900/20 rounded-full blur-[140px] animate-pulse duration-10000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md bg-[#15161e]/90 border border-[var(--border)] rounded-3xl p-8 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center mb-6">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/30 shadow-[0_0_20px_rgba(3,239,98,0.15)]">
            <Shield size={36} className="animate-pulse" />
          </div>
          <h2 className="text-xs font-bold text-[var(--accent-green)] uppercase tracking-widest text-center">DC Mastery Hub</h2>
          <h1 className="mt-1 text-3xl font-black text-white italic tracking-tighter uppercase text-center">CREATE ACCOUNT</h1>
        </div>

        {error && (
          <div className="mb-5 flex gap-2.5 items-start rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-red-400 text-sm animate-in slide-in-from-top-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xxs uppercase tracking-wider text-[var(--text-muted)] font-bold">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose username (min 3 chars)"
                className="w-full rounded-2xl bg-zinc-950/50 border border-[var(--border)] py-4 pl-12 pr-4 text-base font-medium text-white placeholder-zinc-600 focus:border-[var(--accent-green)] focus:ring-1 focus:ring-[var(--accent-green)] focus:outline-none transition-all"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xxs uppercase tracking-wider text-[var(--text-muted)] font-bold">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose password (min 6 chars)"
                className="w-full rounded-2xl bg-zinc-950/50 border border-[var(--border)] py-4 pl-12 pr-4 text-base font-medium text-white placeholder-zinc-600 focus:border-[var(--accent-green)] focus:ring-1 focus:ring-[var(--accent-green)] focus:outline-none transition-all"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xxs uppercase tracking-wider text-[var(--text-muted)] font-bold">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-2xl bg-zinc-950/50 border border-[var(--border)] py-4 pl-12 pr-4 text-base font-medium text-white placeholder-zinc-600 focus:border-[var(--accent-green)] focus:ring-1 focus:ring-[var(--accent-green)] focus:outline-none transition-all"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 rounded-2xl bg-[var(--accent-green)] py-4 text-base font-bold text-black shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] hover:bg-[var(--accent-green-bright)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 font-black tracking-wide cursor-pointer"
          >
            {loading ? 'REGISTERING...' : (
              <>
                REGISTER ACCOUNT <ArrowRight size={18} strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs font-semibold text-zinc-500">
          Already have an account?{' '}
          <button
            onClick={onNavigateToLogin}
            className="text-[var(--accent-green)] hover:text-[var(--accent-green-bright)] font-bold underline transition-colors cursor-pointer"
          >
            Log in here
          </button>
        </div>
      </div>
    </div>
  );
}
