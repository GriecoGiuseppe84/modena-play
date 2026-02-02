import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await requestPasswordReset(email);
      setDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Errore invio email';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      compact
      title="Recupera password"
      subtitle="Inserisci la tua email: riceverai un link per impostare una nuova password."
      right={
        <>
          <Link className="mp-btn-secondary" to="/login">Login</Link>
          <Link className="mp-btn-secondary" to="/signup">Signup</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="mp-card p-6 md:p-7 max-w-md mx-auto">
        <div className="mp-badge text-modena-cyan border-modena-cyan/30 bg-modena-cyan/10">📩 Reset</div>

        <div className="mt-4 space-y-3">
          <input
            className="mp-input"
            placeholder="Email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {done && (
            <div className="text-sm rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-100 p-3">
              Email inviata (se l&apos;account esiste). Controlla la posta e segui il link.
            </div>
          )}

          {error && (
            <div className="text-sm rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 p-3">
              {error}
            </div>
          )}

          <button disabled={busy || done} className="mp-btn-primary w-full">
            {busy ? 'Invio...' : done ? 'Inviata' : 'Invia link reset'}
          </button>
        </div>

        <div className="mt-4 text-sm text-slate-300">
          <Link className="text-modena-cyan hover:brightness-110" to="/login">
            Torna al login
          </Link>
        </div>
      </form>
    </AppShell>
  );
}
