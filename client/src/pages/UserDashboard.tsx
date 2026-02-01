import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

export default function UserDashboard() {
  const nav = useNavigate();
  const { email, logout } = useAuth();
  return (
    <ProtectedRoute role="user">
      <div className="min-h-screen p-6 bg-slate-950 text-slate-100">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black">Area Utente</h1>
              <div className="text-xs text-slate-400">{email ?? '—'}</div>
            </div>
            <div className="flex gap-2">
              <Link className="px-3 py-2 rounded border border-slate-800 hover:border-slate-700" to="/">
                Home
              </Link>
              <button
                onClick={() => {
                  logout();
                  nav('/login', { replace: true });
                }}
                className="px-3 py-2 rounded bg-red-700 hover:bg-red-600 font-semibold"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/40">
            <div className="font-semibold">Stato MVP</div>
            <p className="text-sm text-slate-400 mt-2">
              Autenticazione e recupero password sono attivi. I moduli operativi verranno abilitati progressivamente.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/40">
              <div className="font-black">Affiliate</div>
              <div className="text-sm text-slate-400 mt-1">In arrivo</div>
            </div>
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/40">
              <div className="font-black">Marketplace</div>
              <div className="text-sm text-slate-400 mt-1">In arrivo</div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
