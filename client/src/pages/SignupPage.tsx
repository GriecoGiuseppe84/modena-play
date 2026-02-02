import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';

export default function SignupPage() {
  const nav = useNavigate();
  const { registerUser } = useAuth();

  const [role, setRole] = useState<'user' | 'seller'>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const { needsEmailConfirmation, role: serverRole } = await registerUser(email, password, role);

      if (needsEmailConfirmation) {
        setInfo(
          'Account creato. Controlla la tua email per confermare la registrazione, poi torna qui e fai login.'
        );
        // opzionale: porta al login dopo 1 secondo
        setTimeout(() => nav('/login', { replace: true }), 1200);
        return;
      }

      nav(serverRole === 'seller' ? '/seller/dashboard' : '/user/dashboard', { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Signup fallito';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      compact
      title="Crea account"
      subtitle="Scegli User o Seller. Il portale ti guida con una dashboard iniziale e checklist operative."
      right={
        <>
          <Link className="mp-btn-secondary" to="/">Home</Link>
          <Link className="mp-btn-secondary" to="/login">Login</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="mp-card p-6 md:p-7 max-w-md mx-auto">
        <div className="mp-badge text-modena-gold border-modena-gold/30 bg-modena-gold/10">✨ Signup</div>

        <div className="mt-4">
          <label className="text-xs text-slate-400">Ruolo</label>
          <select
            className="mp-input mt-1"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
          >
            <option value="user">User</option>
            <option value="seller">Seller</option>
          </select>
        </div>

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
            placeholder="Password (min 6)"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {info && (
            <div className="text-sm rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-100 p-3">
              {info}
            </div>
          )}
          {error && (
            <div className="text-sm rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 p-3">
              {error}
            </div>
          )}

          <button disabled={busy} className="mp-btn-primary w-full">
            {busy ? 'Creo account...' : 'Crea account'}
          </button>
        </div>

        <div className="mt-4 text-sm text-slate-300">
          Hai già un account?{' '}
          <Link className="text-modena-cyan hover:brightness-110" to="/login">
            Vai al login
          </Link>
        </div>
      </form>
    </AppShell>
  );
}
