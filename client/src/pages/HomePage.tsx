import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SplashIntro from '../components/common/SplashIntro';
import logo from '../assets/modenaplay-logo.svg';
import { getStoredUser } from '../services/auth';

export default function HomePage() {
  const nav = useNavigate();
  const [showSplash, setShowSplash] = useState(() => sessionStorage.getItem('mp_splash_done') !== '1');

  const hasUser = useMemo(() => !!getStoredUser(), []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {showSplash && <SplashIntro onDone={() => { sessionStorage.setItem('mp_splash_done','1'); setShowSplash(false); }} />}

      <div className="max-w-5xl mx-auto px-6 pt-16">
        <div className="flex items-center justify-between gap-6">
          <img src={logo} alt="Modena Play" className="h-12 md:h-14" />
          <div className="flex gap-2">
            <Link className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold" to="/login">Accedi</Link>
            <Link className="px-4 py-2 rounded-lg border border-slate-800 hover:border-slate-700" to="/signup">Crea account</Link>
          </div>
        </div>

        <div className="mt-14 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight">
              Affiliate hub + Admin dashboard,
              <span className="text-indigo-300"> pronto</span>.
            </h1>
            <p className="mt-4 text-slate-400">
              MVP “Modena Play”: Setup Wizard (una sola volta), gestione link affiliate, tracciamento click e KPI base.
              Area minima User/Seller per iniziare a testare signup/login e flussi.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold"
                onClick={() => nav('/signup')}
              >
                Prova subito (Signup)
              </button>
              <button
                className="px-5 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700"
                onClick={() => nav('/admin/login')}
              >
                Accesso Admin
              </button>
              {hasUser && (
                <button
                  className="px-5 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700"
                  onClick={() => nav('/dashboard')}
                >
                  Vai alla Dashboard
                </button>
              )}
            </div>

            <div className="mt-8 text-xs text-slate-500">
              UX più “Amazon-like”: login user normale, admin su URL dedicata.
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20">
            <div className="text-sm font-semibold">Cosa puoi testare adesso</div>
            <ul className="mt-3 text-sm text-slate-400 space-y-2 list-disc list-inside">
              <li>Signup e login User/Seller (ruolo su profiles)</li>
              <li>Admin login + Setup Wizard + Dashboard</li>
              <li>Creazione link affiliate e KPI base</li>
            </ul>
            <div className="mt-4 text-xs text-slate-500">
              Nota: se in Supabase Auth è attiva la conferma email, disattivala per MVP.
            </div>
          </div>
        </div>

        <div className="mt-20 pb-10 text-xs text-slate-600">
          © 2026 Modena Play · Affiliate Platform MVP
        </div>
      </div>
    </div>
  );
}
