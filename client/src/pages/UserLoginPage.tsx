import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';

export default function UserLoginPage() {
  const nav = useNavigate();
  const { loginUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const { role } = await loginUser(email, password);
      nav(role === 'seller' ? '/seller/dashboard' : '/user/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Login fallito';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      compact
      title="Accedi"
      subtitle="Login standard (User o Seller)."
      right={
        <>
          <Link className="mp-btn-secondary" to="/">Home</Link>
          <Link className="mp-btn-secondary" to="/signup">Signup</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="mp-card p-6 md:p-7 max-w-md mx-auto">
        <div className="mp-badge text-modena-cyan border-modena-cyan/30 bg-modena-cyan/10">🔐 Accesso</div>

        <div className="mt-4 space-y-3">
          <input
            className="mp-input"
            placeholder="Email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="mp-input"
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="text-sm rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 p-3">
              {error}
            </div>
          )}

          <button disabled={busy} className="mp-btn-primary w-full">
            {busy ? 'Accesso...' : 'Entra'}
          </button>
        </div>

        <div className="mt-4 text-sm text-slate-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>
            Non hai un account?{' '}
            <Link className="text-modena-cyan hover:brightness-110" to="/signup">
              Crea account
            </Link>
          </span>
          <Link className="text-modena-cyan hover:brightness-110" to="/forgot-password">
            Password dimenticata?
          </Link>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 text-xs text-slate-400">
          Sei admin?{' '}
          <Link className="text-modena-gold hover:brightness-110" to="/admin/login">
            Accesso Admin
          </Link>
        </div>
      </form>
    </AppShell>
  );
}
