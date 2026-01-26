import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

type Step = 1 | 2 | 3 | 4 | 5;

export default function SetupWizard() {
  const { role } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [status, setStatus] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [appName, setAppName] = useState('Modena Play');
  const [adminEmail, setAdminEmail] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [timezone, setTimezone] = useState('Europe/Rome');
  const [maxClick, setMaxClick] = useState(5000);

  const steps = useMemo(() => ([
    { id: 1, title: 'Connessione Supabase' },
    { id: 2, title: 'Schema Database' },
    { id: 3, title: 'Configurazione piattaforma' },
    { id: 4, title: 'Test API' },
    { id: 5, title: 'Checklist finale' },
  ]), []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/admin/setup/status');
        if (data?.completed) window.location.replace('/admin/dashboard');
      } catch {}
    })();
  }, []);

  if (role !== 'admin') return <div className="p-6">Forbidden</div>;

  async function runStep1() {
    setBusy(true); setError(null);
    try {
      await api.post('/api/admin/setup/step1');
      setStatus((s) => ({ ...s, step1: true }));
      setStep(2);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Errore connessione Supabase');
    } finally { setBusy(false); }
  }

  async function runStep2() {
    setBusy(true); setError(null);
    try {
      const { data } = await api.post('/api/admin/setup/step2');
      setStatus((s) => ({ ...s, step2: true, step2data: data }));
      setStep(3);
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Errore schema DB';
      const hint = e?.response?.data?.action ? `\n\n${e.response.data.action}` : '';
      setError(`${msg}${hint}`);
    } finally { setBusy(false); }
  }

  async function runStep3() {
    setBusy(true); setError(null);
    try {
      await api.post('/api/admin/setup/step3', {
        appName, adminEmail: adminEmail || '(from env)',
        currency, timezone, maxClickthroughPerDay: maxClick,
      });
      setStatus((s) => ({ ...s, step3: true }));
      setStep(4);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Errore salvataggio config');
    } finally { setBusy(false); }
  }

  async function runStep4() {
    setBusy(true); setError(null);
    try {
      const { data } = await api.get('/api/health');
      setStatus((s) => ({ ...s, step4: true, health: data }));
      setStep(5);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Health check fallito');
    } finally { setBusy(false); }
  }

  async function complete() {
    setBusy(true); setError(null);
    try {
      await api.post('/api/admin/setup/complete');
      window.location.replace('/admin/dashboard');
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Errore completamento setup');
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black">Setup Wizard</h1>
          <p className="text-slate-400 mt-2">Configurazione iniziale (una sola volta).</p>
        </div>
        {busy && <LoadingSpinner label="Esecuzione..." />}
      </div>

      <div className="grid md:grid-cols-5 gap-3 mt-6">
        {steps.map((s) => (
          <div key={s.id} className={`rounded-xl border px-3 py-3 ${step === s.id ? 'border-sky-500 bg-sky-950/20' : 'border-slate-800 bg-slate-900/30'}`}>
            <div className="text-xs font-black text-slate-300">STEP {s.id}</div>
            <div className="text-sm font-semibold">{s.title}</div>
            <div className="text-xs mt-1 text-slate-400">{status[`step${s.id}`] ? '✅ Completato' : '—'}</div>
          </div>
        ))}
      </div>

      {error && <div className="mt-6 text-sm text-red-200 bg-red-950/30 border border-red-900 rounded-xl p-4 whitespace-pre-wrap">{error}</div>}

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
        {step === 1 && (
          <div>
            <h2 className="text-xl font-black">STEP 1: Verifica connessione Supabase</h2>
            <p className="text-slate-400 mt-2">Esegue una RPC `mg_now()` per verificare la connessione.</p>
            <button disabled={busy} onClick={runStep1} className="mt-4 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black">
              Avvia Step 1
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-black">STEP 2: Verifica schema DB</h2>
            <p className="text-slate-400 mt-2">Controlla che le tabelle esistano. Se mancano, ti dirà di applicare la migration SQL.</p>
            <button disabled={busy} onClick={runStep2} className="mt-4 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black">
              Avvia Step 2
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="text-xl font-black">STEP 3: Configurazione piattaforma</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="block">
                <div className="text-sm font-semibold text-slate-300">App Name</div>
                <input className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2" value={appName} onChange={(e) => setAppName(e.target.value)} />
              </label>
              <label className="block">
                <div className="text-sm font-semibold text-slate-300">Admin Email (facoltativo)</div>
                <input className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2" placeholder="(from env)" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
              </label>
              <label className="block">
                <div className="text-sm font-semibold text-slate-300">Currency</div>
                <select className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </label>
              <label className="block">
                <div className="text-sm font-semibold text-slate-300">Timezone</div>
                <select className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  <option value="Europe/Rome">Europe/Rome</option>
                  <option value="UTC">UTC</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                <div className="text-sm font-semibold text-slate-300">Max clickthrough per day</div>
                <input type="number" className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2" value={maxClick} onChange={(e) => setMaxClick(Number(e.target.value))} />
              </label>
            </div>
            <button disabled={busy} onClick={runStep3} className="mt-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black">
              Salva Config
            </button>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-xl font-black">STEP 4: Test Connettività API</h2>
            <p className="text-slate-400 mt-2">Chiama /api/health e mostra il risultato.</p>
            <button disabled={busy} onClick={runStep4} className="mt-4 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black">
              Esegui Test
            </button>
            {status.health && (
              <pre className="mt-4 text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-auto">{JSON.stringify(status.health, null, 2)}</pre>
            )}
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-xl font-black">STEP 5: Checklist finale</h2>
            <ul className="mt-3 space-y-1 text-slate-200 text-sm">
              <li>{status.step1 ? '✅' : '⬜'} Supabase connesso</li>
              <li>{status.step2 ? '✅' : '⬜'} Schema DB verificato</li>
              <li>{status.step3 ? '✅' : '⬜'} Config salvata</li>
              <li>{status.step4 ? '✅' : '⬜'} Health verificato</li>
            </ul>
            <button disabled={busy || !(status.step1 && status.step2 && status.step3 && status.step4)} onClick={complete} className="mt-4 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-black">
              Completa Setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
