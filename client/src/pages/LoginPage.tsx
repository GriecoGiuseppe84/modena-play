import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminLogin } from '../services/auth';
import { login as publicLogin } from '../services/publicAuth';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const nav = useNavigate();
  const { setUser } = useAuth();

  const [mode, setMode] = useState<'admin'|'user'|'seller'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (mode !== 'admin') {
        const u = await publicLogin(email, password);
        setUser(u);
        nav(mode === 'seller' ? '/seller/dashboard' : '/user/dashboard', { replace: true });
        return;
      }
      const u = await adminLogin(email, password);
      setUser(u);
      nav('/admin/setup', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Login fallito');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-950">
        <h1 className="text-2xl font-black">Login</h1>
        <p className="text-sm text-slate-400 mt-1">Admin login usa credenziali Render env.</p>

        <div className="mt-4">
          <label className="text-xs text-slate-400">Modalità</label>
          <select className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800"
            value={mode} onChange={e=>setMode(e.target.value as any)}>
            <option value="admin">Admin</option>
            <option value="user">User (placeholder)</option>
            <option value="seller">Seller (placeholder)</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
            placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
            placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          {error && <div className="text-sm text-red-300">{error}</div>}
          <button disabled={busy} className="w-full px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold">
            {busy ? 'Accesso...' : 'Entra'}
          </button>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          Non hai un account? <Link className="text-indigo-300 hover:text-indigo-200" to="/signup">Vai a Signup</Link>
        </div>
      </form>
    </div>
  );
}
