import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';

export default function AdminLoginPage() {
  const nav = useNavigate();
  const { loginAdmin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await loginAdmin(email, password);
      nav('/admin/dashboard', { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Login admin fallito';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      compact
      title="Accesso Admin"
      subtitle="Usa le credenziali definite negli env del backend (Render)."
      right={<Link className="mp-btn-secondary" to="/">Home</Link>}
    >
      <form onSubmit={onSubmit} className="mp-card p-6 md:p-7 max-w-md mx-auto">
        <div className="mp-badge text-modena-gold border-modena-gold/30 bg-modena-gold/10">🛡️ Admin</div>

        <div className="mt-4 space-y-3">
          <input
            className="mp-input"
            placeholder="Email admin"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="mp-input"
            placeholder="Password admin"
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
            {busy ? 'Accesso...' : 'Entra (Admin)'}
          </button>
        </div>

        <div className="mt-4 text-xs text-slate-400">
          Suggerimento: se ti serve DB e tabelle, usa <Link className="text-modena-cyan hover:brightness-110" to="/admin/diagnostics">Diagnostica DB</Link> dopo il login.
        </div>
      </form>
    </AppShell>
  );
}
