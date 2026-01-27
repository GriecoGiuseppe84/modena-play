import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminLogin } from '../services/auth';
import { useAuth } from '../context/AuthContext';

export default function AdminLoginPage() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const u = await adminLogin(email, password);
      setUser(u);
      nav('/admin/setup', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Login admin fallito');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <form onSubmit={onSubmit} className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-950/70">
        <h1 className="text-2xl font-black">Admin Access</h1>
        <p className="text-sm text-slate-400 mt-1">Usa credenziali definite negli env di Render.</p>

        <div className="mt-4 space-y-3">
          <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
            placeholder="Email admin" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
            placeholder="Password admin" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} />
          {error && <div className="text-sm text-red-300">{error}</div>}
          <button disabled={busy} className="w-full px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold">
            {busy ? 'Accesso...' : 'Entra (Admin)'}
          </button>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          Torna al sito: <Link className="text-indigo-300 hover:text-indigo-200" to="/">Home</Link>
        </div>
      </form>
    </div>
  );
}
