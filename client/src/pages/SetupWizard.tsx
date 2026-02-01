import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
    <span
      className={
        'text-xs px-2 py-1 rounded-full border ' +
        (ok ? 'border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-400')
      }
    >
      {ok ? '✅ OK' : '—'}
    </span>
  );

  return (
    <div className="min-h-screen p-6 bg-slate-950 text-slate-100">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-black">Diagnostica & Setup (Admin)</h1>
        <p className="text-sm text-slate-400">
          Questa pagina è opzionale: serve solo per verificare il DB e (se vuoi) creare le tabelle base.
          Per migrazioni Step 2 serve DATABASE_URL su Render.
        </p>

        {completed === true && (
          <div className="text-sm text-emerald-300">
            Setup DB risulta già completato ✅ (puoi comunque rieseguire i test).
          </div>
        )}

        {error && <div className="text-sm text-red-300">{error}</div>}

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Step 1 — Verifica Connessione DB</div>
              {pill(step > 1)}
            </div>
            <button
              disabled={busy || step !== 1}
              onClick={step1}
              className="mt-3 px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
            >
              {busy && step === 1 ? 'Verifica...' : 'Esegui'}
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Step 2 — Crea/Verifica Tabelle</div>
              {pill(step > 2)}
            </div>
            <button
              disabled={busy || step !== 2}
              onClick={step2}
              className="mt-3 px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
            >
              {busy && step === 2 ? 'Eseguo...' : 'Esegui'}
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Step 3 — Configurazione</div>
              {pill(step > 3)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-slate-400">App Name</label>
                <input
                  className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Admin Email</label>
                <input
                  disabled
                  className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800 opacity-70"
                  value={adminEmail}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Currency</label>
                <select
                  className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800"
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
                  className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800"
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
                  className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800"
                  value={maxClickThroughPerDay}
                  onChange={(e) => setMax(Number(e.target.value))}
                />
              </div>
            </div>

            <button
              disabled={busy || step !== 3}
              onClick={step3}
              className="mt-3 px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
            >
              {busy && step === 3 ? 'Salvo...' : 'Salva config'}
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Step 4 — Test Health API</div>
              {pill(step > 4)}
            </div>
            <button
              disabled={busy || step !== 4}
              onClick={step4}
              className="mt-3 px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
            >
              {busy && step === 4 ? 'Test...' : 'Esegui test'}
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Step 5 — Completa Setup</div>
              {pill(false)}
            </div>
            <button
              disabled={busy || step !== 5 || completed === true}
              onClick={complete}
              className="mt-3 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold"
            >
              {busy && step === 5 ? 'Completo...' : 'Completa Setup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
