import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { api } from '../services/api';

export default function AffiliateRedirectPage() {
  const { slug } = useParams();
  const safeSlug = useMemo(() => String(slug || '').trim(), [slug]);

  const [dest, setDest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!safeSlug) {
        setError('Link non valido');
        return;
      }
      try {
        setError(null);
        const r = await api.get(`/api/affiliate/resolve/${encodeURIComponent(safeSlug)}`, {
          timeout: 7000,
        });
        const url = String(r?.data?.destination_url || '').trim();
        if (!/^https?:\/\//i.test(url)) throw new Error('Destinazione non valida');
        if (!alive) return;
        setDest(url);
        // piccolo delay per far vedere la UI (e ridurre false positives su popup blockers)
        setTimeout(() => {
          try {
            window.location.assign(url);
          } catch {
            // fallback: nothing
          }
        }, 250);
      } catch (e: any) {
        const msg = e?.response?.data?.error || e?.message || 'Impossibile risolvere il link';
        if (!alive) return;
        setError(msg);
      }
    })();
    return () => {
      alive = false;
    };
  }, [safeSlug]);

  return (
    <AppShell
      compact
      title="Reindirizzamento"
      subtitle="Un istante: stiamo aprendo il link e registrando il click."
      right={<Link className="mp-btn-secondary" to="/">Home</Link>}
    >
      <div className="mp-card p-6">
        {!error && !dest && (
          <div className="text-slate-300 text-sm">
            <div className="font-black text-lg">Sto caricando…</div>
            <div className="mt-2">Se il backend è in cold-start su Render può volerci qualche secondo.</div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 text-sm">
            {error}
          </div>
        )}

        {dest && (
          <div className="space-y-3">
            <div className="font-black text-lg">Ti stiamo reindirizzando…</div>
            <div className="text-sm text-slate-300 break-words">Destinazione: {dest}</div>
            <a className="mp-btn-primary" href={dest} rel="noreferrer">
              Vai subito
            </a>
            <div className="text-xs text-slate-400">
              Se non succede nulla, clicca il pulsante sopra.
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
