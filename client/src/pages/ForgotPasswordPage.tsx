import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-950/70"
      >
        <h1 className="text-2xl font-black">Recupera password</h1>
        <p className="text-sm text-slate-400 mt-1">
          Inserisci la tua email: riceverai un link per impostare una nuova password.
        </p>

        <div className="mt-4 space-y-3">
          <input
            className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
            placeholder="Email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {done && (
            <div className="text-sm text-emerald-300">
              Email inviata (se l&apos;account esiste). Controlla la posta e segui il link.
            </div>
          )}

          {error && <div className="text-sm text-red-300">{error}</div>}

          <button
            disabled={busy || done}
            className="w-full px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold"
          >
            {busy ? 'Invio...' : done ? 'Inviata' : 'Invia link reset'}
          </button>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          <Link className="text-indigo-300 hover:text-indigo-200" to="/login">
            Torna al login
          </Link>
        </div>
      </form>
    </div>
  );
}
