import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
      const { needsEmailConfirmation } = await registerUser(email, password);

      if (needsEmailConfirmation) {
        setInfo(
          'Account creato. Controlla la tua email per confermare la registrazione, poi torna qui e fai login.'
        );
        // opzionale: porta al login dopo 1 secondo
        setTimeout(() => nav('/login', { replace: true }), 1200);
        return;
      }

      nav(role === 'seller' ? '/seller/dashboard' : '/user/dashboard', { replace: true });
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-950"
      >
        <h1 className="text-2xl font-black">Signup</h1>
        <p className="text-sm text-slate-400 mt-1">
          Crea un account User o Seller (Supabase Auth).
        </p>

        <div className="mt-4">
          <label className="text-xs text-slate-400">Ruolo</label>
          <select
            className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
          >
            <option value="user">User</option>
            <option value="seller">Seller</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          <input
            className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
            placeholder="Email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
            placeholder="Password (min 6)"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {info && <div className="text-sm text-emerald-300">{info}</div>}
          {error && <div className="text-sm text-red-300">{error}</div>}

          <button
            disabled={busy}
            className="w-full px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold"
          >
            {busy ? 'Creo account...' : 'Crea account'}
          </button>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          Hai già un account?{' '}
          <Link className="text-indigo-300 hover:text-indigo-200" to="/login">
            Vai al Login
          </Link>
        </div>
      </form>
    </div>
  );
}
