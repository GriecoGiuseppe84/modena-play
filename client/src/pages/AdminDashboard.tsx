import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

export default function AdminDashboard() {
  const { user, email, logout } = useAuth();

  const [me, setMe] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    (async () => {
      try {
        setError(null);
        const r = await api.get('/api/admin/me');
        setMe(r.data);
      } catch (e: any) {
        const msg = e?.response?.data?.error || e?.message || 'Errore verifica token';
        setError(msg);
      }
    })();
  }, [user]);

  return (
    <ProtectedRoute role="admin" redirectTo="/admin/login">
      <div className="min-h-screen p-6 bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Admin</h1>
            <div className="text-xs text-slate-400">{email ?? '—'}</div>
          </div>
          <button
            onClick={() => {
              logout();
              window.location.href = '/admin/login';
            }}
            className="px-3 py-2 rounded bg-red-700 hover:bg-red-600 font-semibold"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-red-900 bg-red-950/40 text-red-200 text-sm">
            {error}
          </div>
        )}

        {!error && !me && (
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 text-sm text-slate-300">
            Verifica token in corso...
          </div>
        )}

        {me && (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2">
            <div className="font-semibold">Token OK ✅</div>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words">
              {JSON.stringify(me, null, 2)}
            </pre>
          </div>
        )}

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
          <div className="font-black">Cosa c'è in questo MVP</div>
          <ul className="text-sm text-slate-300 list-disc list-inside space-y-1">
            <li>Login / Signup (User o Seller)</li>
            <li>Recupero password via Supabase</li>
            <li>Admin login con credenziali ENV</li>
          </ul>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 font-semibold"
              to="/admin/diagnostics"
            >
              Diagnostica DB
            </Link>
            <Link
              className="px-4 py-2 rounded border border-slate-800 hover:border-slate-700"
              to="/"
            >
              Home
            </Link>
          </div>

          <div className="text-xs text-slate-500">
            Nota: la dashboard affiliate/analytics la abilitiamo dopo aver confermato il DB.
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}
