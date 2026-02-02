import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import AppShell from '../components/AppShell';

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
    <AppShell
      compact
      title="Imposta nuova password"
      subtitle="Completa il reset e poi torna al login."
      right={<Link className="mp-btn-secondary" to="/login">Login</Link>}
    >
      <div className="mp-card p-6 md:p-7 max-w-md mx-auto">

        {stage === 'loading' && <p className="mt-3 text-sm text-slate-300">Verifico il link...</p>}

        {stage === 'error' && (
          <div className="mt-4 space-y-3">
            <div className="text-sm rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 p-3">{error}</div>
            <Link className="text-modena-cyan hover:brightness-110 text-sm" to="/forgot-password">
              Richiedi un nuovo link
            </Link>
          </div>
        )}

        {stage === 'done' && (
          <div className="mt-4 space-y-3">
            <div className="text-sm rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-100 p-3">
              Password aggiornata. Ora puoi fare login.
            </div>
            <Link className="text-modena-cyan hover:brightness-110 text-sm" to="/login">
              Vai al login
            </Link>
          </div>
        )}

        {stage === 'ready' && (
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <input
              className="mp-input"
              placeholder="Nuova password (min 6)"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className="mp-input"
              placeholder="Conferma password"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />

            {mismatch && (
              <div className="text-sm rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 p-3">
                Le password non coincidono.
              </div>
            )}
            {error && (
              <div className="text-sm rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 p-3">{error}</div>
            )}

            <button
              disabled={busy || password.length < 6 || mismatch}
              className="mp-btn-primary w-full disabled:opacity-50"
            >
              {busy ? 'Salvo...' : 'Salva nuova password'}
            </button>

            <div className="text-xs text-slate-500">
              Se vedi errori di redirect, aggiungi l'URL del tuo sito in Supabase → Authentication → URL Configuration.
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
