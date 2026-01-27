import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function SignupPage() {
  const [role, setRole] = useState<'user'|'seller'>('user');

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-black">Signup (MVP minimo)</h1>
        <p className="text-slate-400">
          In questo ZIP l’area User/Seller è predisposta a livello UI/route, ma l’onboarding/auth completa verrà attivata nel prossimo step.
        </p>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
          <label className="text-xs text-slate-400">Scegli ruolo</label>
          <select className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
            value={role} onChange={e=>setRole(e.target.value as any)}>
            <option value="user">User</option>
            <option value="seller">Seller</option>
          </select>
          <div className="text-sm text-slate-400">
            Selezionato: <span className="font-semibold text-slate-200">{role}</span>
          </div>
          <div className="text-xs text-slate-500">
            Prossimo step: signup reale con Supabase Auth + provisioning profile.
          </div>
        </div>

        <Link className="inline-block px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 font-semibold" to="/login">
          Torna al login
        </Link>
      </div>
    </div>
  );
}
