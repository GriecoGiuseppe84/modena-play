import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

function parseHashParams(hash: string) {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(h);
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type'),
  };
}

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<'loading' | 'ready' | 'error' | 'done'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);

  const mismatch = useMemo(() => password.length > 0 && password2.length > 0 && password !== password2, [password, password2]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setError(null);

      try {
        if (!isSupabaseConfigured) {
          throw new Error('Supabase non configurato nel frontend. Imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
        }
        // 1) PKCE: ?code=...
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
        } else {
          // 2) Implicit: #access_token=...&refresh_token=...&type=recovery
          const { access_token, refresh_token } = parseHashParams(window.location.hash);
          if (access_token && refresh_token) {
            const { error: setErr } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (setErr) throw setErr;
          }
        }

        const { data, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        if (!data.session) {
          throw new Error('Link non valido o scaduto. Ripeti la procedura di recupero password.');
        }

        if (!cancelled) setStage('ready');
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Impossibile inizializzare il reset password');
          setStage('error');
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch) return;

    setBusy(true);
    setError(null);

    try {
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) throw upErr;
      await supabase.auth.signOut();
      setStage('done');
    } catch (e: any) {
      setError(e?.message || 'Errore aggiornamento password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-950/70">
        <h1 className="text-2xl font-black">Imposta nuova password</h1>

        {stage === 'loading' && <p className="mt-3 text-sm text-slate-400">Verifico il link...</p>}

        {stage === 'error' && (
          <div className="mt-4 space-y-3">
            <div className="text-sm text-red-300">{error}</div>
            <Link className="text-indigo-300 hover:text-indigo-200 text-sm" to="/forgot-password">
              Richiedi un nuovo link
            </Link>
          </div>
        )}

        {stage === 'done' && (
          <div className="mt-4 space-y-3">
            <div className="text-sm text-emerald-300">Password aggiornata. Ora puoi fare login.</div>
            <Link className="text-indigo-300 hover:text-indigo-200 text-sm" to="/login">
              Vai al login
            </Link>
          </div>
        )}

        {stage === 'ready' && (
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <input
              className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
              placeholder="Nuova password (min 6)"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800"
              placeholder="Conferma password"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />

            {mismatch && <div className="text-sm text-red-300">Le password non coincidono.</div>}
            {error && <div className="text-sm text-red-300">{error}</div>}

            <button
              disabled={busy || password.length < 6 || mismatch}
              className="w-full px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold"
            >
              {busy ? 'Salvo...' : 'Salva nuova password'}
            </button>

            <div className="text-xs text-slate-500">
              Se vedi errori di redirect, aggiungi l'URL del tuo sito in Supabase → Authentication → URL Configuration.
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
