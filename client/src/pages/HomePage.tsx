import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const nav = useNavigate();
  const { token, kind, role } = useAuth();
  const hasUser = useMemo(() => Boolean(token), [token]);

  return (
    <AppShell
      title="Modena Play"
      subtitle="Il tuo hub gaming italiano. Parti leggero con l'affiliate, valida il traffico, poi scale verso marketplace."
      right={
        <>
          <Link className="mp-btn-secondary" to="/risorse">Risorse</Link>
          <Link className="mp-btn-secondary" to="/login">Accedi</Link>
          <Link className="mp-btn-primary" to="/signup">Crea account</Link>
        </>
      }
    >
      <section className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="mp-card p-6 md:p-7">
          <div className="mp-badge text-modena-cyan border-modena-cyan/30 bg-modena-cyan/10">✨ MVP pronto</div>
          <h2 className="mt-3 text-2xl md:text-3xl font-black">
            Autenticazione solida + Playbook di lancio.
          </h2>
          <p className="mt-2 text-slate-300">
            Login/Signup con password, recupero password e dashboard per ruolo. Dentro trovi una presentazione guidata (checklist + roadmap)
            per trasformare ModenaGiochi in un progetto che converte.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button className="mp-btn-primary" onClick={() => nav('/signup')}>Inizia ora</button>
            <button className="mp-btn-secondary" onClick={() => nav('/login')}>Ho già un account</button>
            <button className="mp-btn-secondary" onClick={() => nav('/admin/login')}>Accesso Admin</button>
            {hasUser && (
              <button
                className="mp-btn-secondary"
                onClick={() => {
                  if (kind === 'admin') nav('/admin/dashboard');
                  else nav(role === 'seller' ? '/seller/dashboard' : '/user/dashboard');
                }}
              >
                Vai alla dashboard
              </button>
            )}
          </div>

          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            <div className="mp-card-soft p-4">
              <div className="text-sm font-semibold">Affiliate Hub</div>
              <div className="text-xs text-slate-400 mt-1">Contenuti + link che convertono.</div>
            </div>
            <div className="mp-card-soft p-4">
              <div className="text-sm font-semibold">Tracking</div>
              <div className="text-xs text-slate-400 mt-1">Misura traffico e click, senza frizioni.</div>
            </div>
            <div className="mp-card-soft p-4">
              <div className="text-sm font-semibold">Scale</div>
              <div className="text-xs text-slate-400 mt-1">Marketplace solo quando conviene.</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="mp-card p-6">
            <h3 className="text-lg font-black">Cosa puoi fare subito</h3>
            <ul className="mt-3 text-sm text-slate-300 space-y-2 list-disc list-inside">
              <li>Creare account e accedere (User / Seller)</li>
              <li>Recuperare password via email (Supabase Auth)</li>
              <li>Seguire il Playbook con checklist (salvata nel browser)</li>
            </ul>
            <div className="mt-4 text-xs text-slate-400">
              Le funzioni DB/analytics avanzate sono modulari: si attivano senza bloccare il portale.
            </div>
          </div>

          <div className="mp-card p-6">
            <h3 className="text-lg font-black">Obiettivo (realistico)</h3>
            <div className="mt-3 grid sm:grid-cols-3 gap-3">
              <div className="mp-card-soft p-4">
                <div className="text-xs text-slate-400">Mese 1</div>
                <div className="text-lg font-black mt-1">€0–50</div>
                <div className="text-xs text-slate-400 mt-1">Setup + 10 articoli.</div>
              </div>
              <div className="mp-card-soft p-4">
                <div className="text-xs text-slate-400">Mese 3</div>
                <div className="text-lg font-black mt-1">€230–560</div>
                <div className="text-xs text-slate-400 mt-1">SEO inizia a spingere.</div>
              </div>
              <div className="mp-card-soft p-4">
                <div className="text-xs text-slate-400">Mese 6</div>
                <div className="text-lg font-black mt-1">€750–1.600</div>
                <div className="text-xs text-slate-400 mt-1">Con costanza + contenuti.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-10 text-xs text-slate-500">© 2026 Modena Play · MVP</div>
    </AppShell>
  );
}
