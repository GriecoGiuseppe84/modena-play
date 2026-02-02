import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';

type Step = 1 | 2 | 3 | 4 | 5;

export default function SetupWizard() {
  const nav = useNavigate();
  const { kind, email } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<boolean | null>(null);

  const [appName, setAppName] = useState('Modena Play');
  const [currency, setCurrency] = useState('EUR');
  const [timezone, setTimezone] = useState('Europe/Rome');
  const [maxClickThroughPerDay, setMax] = useState(500);

  const adminEmail = useMemo(() => email ?? '', [email]);

  // gate admin
  useEffect(() => {
    if (kind !== 'admin') nav('/admin/login', { replace: true });
  }, [kind, nav]);

  useEffect(() => {
    api
      .get<{ completed: boolean }>('/api/admin/setup/status')
      .then((r) => {
        setCompleted(Boolean(r.data.completed));
      })
      .catch(() => setCompleted(null));
  }, []);

  async function run(fn: () => Promise<any>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      const base = e?.response?.data?.error || e?.message || 'Errore';
      const isTimeout =
        String(base).toLowerCase().includes('timeout') ||
        String(e?.code || '').toUpperCase().includes('ECONNABORTED');

      const hint = isTimeout
        ? '\n\nSuggerimenti: (1) verifica che il backend non sia in cold-start; (2) su Render imposta DATABASE_URL nel service "modenaplay-api" (Environment) e riavvia; (3) controlla i Runtime Logs per errori di connessione Postgres.'
        : '';

      setError(String(base) + hint);
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function step1() {
    await run(() => api.post('/api/admin/setup/test-db', null, { timeout: 25_000 }));
    setStep(2);
  }

  async function step2() {
    await run(() => api.post('/api/admin/setup/run-migrations', null, { timeout: 45_000 }));
    setStep(3);
  }

  async function step3() {
    await run(() =>
      api.post('/api/admin/setup/save-config', {
        appName,
        adminEmail,
        currency,
        timezone,
        maxClickThroughPerDay,
      }, { timeout: 20_000 })
    );
    setStep(4);
  }

  async function step4() {
    // nel backend hai /api/health (non /api/health senza prefix) → tu hai healthRoutes su /api/health
    // quindi qui usiamo quello:
    await run(() => api.get('/api/health', { timeout: 20_000 }));
    setStep(5);
  }

  async function complete() {
    await run(() => api.post('/api/admin/setup/complete', null, { timeout: 20_000 }));
    nav('/admin/dashboard', { replace: true });
  }

  const pill = (ok: boolean) => (
    <span className={'mp-badge ' + (ok ? 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10' : 'text-slate-300')}>
      {ok ? '✅ OK' : '—'}
    </span>
  );

  return (
    <AppShell
      title="Diagnostica & Setup"
      subtitle="Pagina opzionale: verifica DB, crea tabelle base e salva una config minima. Se lo Step 1 va in timeout, spesso è un cold-start del backend o DATABASE_URL mancante su Render."
      right={
        <>
          <Link className="mp-btn-secondary" to="/admin/dashboard">Dashboard</Link>
          <Link className="mp-btn-secondary" to="/">Home</Link>
        </>
      }
    >
      <div className="max-w-3xl mx-auto space-y-4">

        {completed === true && (
          <div className="text-sm rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-100 p-3">
            Setup DB risulta già completato ✅ (puoi comunque rieseguire i test).
          </div>
        )}

        {error && (
          <div className="text-sm rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 p-3">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="mp-card p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Step 1 — Verifica Connessione DB</div>
              {pill(step > 1)}
            </div>
            <button disabled={busy || step !== 1} onClick={step1} className="mt-3 mp-btn-secondary disabled:opacity-50">
              {busy && step === 1 ? 'Verifica...' : 'Esegui'}
            </button>
          </div>

          <div className="mp-card p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Step 2 — Crea/Verifica Tabelle</div>
              {pill(step > 2)}
            </div>
            <button disabled={busy || step !== 2} onClick={step2} className="mt-3 mp-btn-secondary disabled:opacity-50">
              {busy && step === 2 ? 'Eseguo...' : 'Esegui'}
            </button>
          </div>

          <div className="mp-card p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Step 3 — Configurazione</div>
              {pill(step > 3)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-slate-400">App Name</label>
                <input
                  className="mp-input mt-1"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Admin Email</label>
                <input
                  disabled
                  className="mp-input mt-1 opacity-70"
                  value={adminEmail}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Currency</label>
                <select
                  className="mp-input mt-1"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option>EUR</option>
                  <option>USD</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Timezone</label>
                <select
                  className="mp-input mt-1"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option>Europe/Rome</option>
                  <option>UTC</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Max clickthrough/day</label>
                <input
                  type="number"
                  className="mp-input mt-1"
                  value={maxClickThroughPerDay}
                  onChange={(e) => setMax(Number(e.target.value))}
                />
              </div>
            </div>

            <button disabled={busy || step !== 3} onClick={step3} className="mt-3 mp-btn-primary disabled:opacity-50">
              {busy && step === 3 ? 'Salvo...' : 'Salva config'}
            </button>
          </div>

          <div className="mp-card p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Step 4 — Test Health API</div>
              {pill(step > 4)}
            </div>
            <button disabled={busy || step !== 4} onClick={step4} className="mt-3 mp-btn-secondary disabled:opacity-50">
              {busy && step === 4 ? 'Test...' : 'Esegui test'}
            </button>
          </div>

          <div className="mp-card p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Step 5 — Completa Setup</div>
              {pill(false)}
            </div>
            <button
              disabled={busy || step !== 5 || completed === true}
              onClick={complete}
              className="mt-3 mp-btn-primary disabled:opacity-50"
            >
              {busy && step === 5 ? 'Completo...' : 'Completa Setup'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
