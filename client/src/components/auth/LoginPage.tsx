import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const nav = useNavigate();
  const { loginAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-black">Admin Login</h1>
      <p className="text-slate-400 mt-1">Accesso riservato all&apos;admin (env Render).</p>

      <form className="mt-6 space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setBusy(true);
        try {
          await loginAdmin(email, password);
          nav('/admin/setup', { replace: true });
        } catch (e: any) {
          setErr(e?.response?.data?.error ?? 'Login failed');
        } finally {
          setBusy(false);
        }
      }}>
        <label className="block">
          <div className="text-sm font-semibold text-slate-300">Email</div>
          <input className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <div className="text-sm font-semibold text-slate-300">Password</div>
          <input type="password" className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {err && <div className="text-sm text-red-300 bg-red-950/30 border border-red-900 rounded-lg p-3">{err}</div>}

        <button disabled={busy} className="w-full rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-black py-2">
          {busy ? 'Accesso...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
