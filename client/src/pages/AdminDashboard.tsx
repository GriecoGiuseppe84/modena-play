import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import AppShell from '../components/AppShell';
import OnboardingPlaybook from '../components/OnboardingPlaybook';

export default function AdminDashboard() {
  const { user, email, logout } = useAuth();

  const [me, setMe] = useState<any>(null);
  const [aff, setAff] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    (async () => {
      try {
        setError(null);
        const r = await api.get('/api/admin/me');
        setMe(r.data);

        // mini analytics affiliate (best-effort)
        try {
          const s = await api.get('/api/affiliate/analytics/summary');
          setAff(s.data);
        } catch {
          setAff(null);
        }
      } catch (e: any) {
        const msg = e?.response?.data?.error || e?.message || 'Errore verifica token';
        setError(msg);
      }
    })();
  }, [user]);

  return (
    <ProtectedRoute role="admin" redirectTo="/admin/login">
      <AppShell
        title="Admin Control Room"
        subtitle="Stato auth, diagnostica DB e pannello di lancio per la strategia affiliate."
        right={
          <>
            <Link className="mp-btn-secondary" to="/">Home</Link>
            <Link className="mp-btn-secondary" to="/admin/diagnostics">Diagnostica DB</Link>
            <Link className="mp-btn-secondary" to="/admin/affiliate-links">Affiliate Links</Link>
            <button
              onClick={() => {
                logout();
                window.location.href = '/admin/login';
              }}
              className="mp-btn-danger"
            >
              Logout
            </button>
          </>
        }
      >
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mp-badge">🧑‍💻 {email ?? '—'}</span>
            <span className="mp-badge text-modena-gold border-modena-gold/30 bg-modena-gold/10">admin</span>
          </div>

          {error && (
            <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 text-sm">
              {error}
            </div>
          )}

          {!error && !me && (
            <div className="mp-card-soft p-4 text-sm text-slate-300">
              Verifica token in corso...
            </div>
          )}

          {me && (
            <div className="mp-card p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-black">Token OK ✅</div>
                  <div className="text-sm text-slate-300">Auth valida. Puoi usare i tools admin.</div>
                </div>
                <Link className="mp-btn-primary" to="/admin/diagnostics">
                  Vai alla diagnostica
                </Link>
              </div>

              <details className="mt-4 mp-card-soft p-4">
                <summary className="cursor-pointer font-semibold">Dettagli payload</summary>
                <pre className="mt-3 text-xs text-slate-200 whitespace-pre-wrap break-words">
                  {JSON.stringify(me, null, 2)}
                </pre>
              </details>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="mp-card p-6">
              <div className="font-black">MVP Attuale</div>
              <ul className="mt-3 text-sm text-slate-300 list-disc list-inside space-y-1">
                <li>Login / Signup (User o Seller)</li>
                <li>Recupero password via Supabase</li>
                <li>Admin login con credenziali ENV</li>
                <li>Setup Wizard DB (opzionale)</li>
                <li>Affiliate Links (CRUD + redirect /r/&lt;slug&gt;)</li>
              </ul>
              {aff ? (
                <div className="mt-4 space-y-2">
                  <div className="text-xs text-slate-400">Mini metriche (ultimi 7 giorni)</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="mp-badge">{aff.last7DaysClicks ?? 0} click</span>
                    <span className="mp-badge">{aff.activeLinks ?? 0} link attivi</span>
                    <span className="mp-badge">{aff.totalClicks ?? 0} totali</span>
                  </div>
                  <Link className="mp-btn-primary" to="/admin/affiliate-links">
                    Gestisci Affiliate Links
                  </Link>
                </div>
              ) : (
                <div className="mt-4 text-xs text-slate-400">
                  Se non vedi le metriche, verifica che l'API abbia SUPABASE_SERVICE_ROLE_KEY.
                </div>
              )}
            </div>

            <div className="mp-card p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-black">Growth Playbook</div>
                  <div className="text-sm text-slate-300 mt-1">
                    Presentazione iniziale per nuovi utenti: checklist + roadmap.
                  </div>
                </div>
                <span className="mp-badge">📈 SEO + Affiliate</span>
              </div>

              <details className="mt-4 mp-card-soft p-4">
                <summary className="cursor-pointer font-semibold">Apri il Playbook completo</summary>
                <div className="mt-4">
                  <OnboardingPlaybook email={email} />
                </div>
              </details>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
