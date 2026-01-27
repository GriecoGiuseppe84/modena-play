import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login as publicLogin } from '../services/publicAuth';
import { useAuth } from '../context/AuthContext';

export default function UserLoginPage() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [mode, setMode] = useState<'user'|'seller'>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const u = await publicLogin(email, password);
      setUser(u);
      nav(mode === 'seller' ? '/seller/dashboard' : '/user/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Login fallito');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <form onSubmit={onSubmit} className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-950/70">
        <h1 className="text-2xl font-black">Accedi</h1>
        <p className="text-sm text-slate-400 mt-1">Login standard (User o Seller).</p>

        <div className="mt-4">
          <label className="text-xs text-slate-400">Tipo account</label>
          <select className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800"
            value={mode} onChange={e=>setMode(e.target.value as any)}>
            <option value="user">User</option>
            <option value="seller">Seller</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
            placeholder="Email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
            placeholder="Password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} />
          {error && <div className="text-sm text-red-300">{error}</div>}
          <button disabled={busy} className="w-full px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold">
            {busy ? 'Accesso...' : 'Entra'}
          </button>
        </div>

        <div className="mt-4 text-sm text-slate-400 flex justify-between">
          <span>Non hai un account? <Link className="text-indigo-300 hover:text-indigo-200" to="/signup">Vai a Signup</Link></span>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500">
          Sei admin? <Link className="text-emerald-300 hover:text-emerald-200" to="/admin/login">Accesso Admin</Link>
        </div>
      </form>
    </div>
  );
}
