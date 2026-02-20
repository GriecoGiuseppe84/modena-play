import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppShell from '../components/AppShell';
import { api } from '../services/api';
import AffiliateBox from '../components/AffiliateBox';
import { usePageView } from '../hooks/usePageView';
import { useAuth } from '../context/AuthContext';

export default function Offers() {
  const loc = useLocation();
  const nav = useNavigate();
  usePageView('Offerte');

  const { token, kind, role } = useAuth();
  const hasUser = Boolean(token);
  const dashboardPath = useMemo(() => {
    if (!token) return null;
    if (kind === 'admin') return '/admin/dashboard';
    return role === 'seller' ? '/seller/dashboard' : '/user/dashboard';
  }, [token, kind, role]);

  const [tag, setTag] = useState<string>('');

  const q = useQuery({
    queryKey: ['public-links', tag],
    queryFn: async () => {
      const { data } = await api.get('/api/affiliate/public/links', { params: { tag: tag || undefined, limit: 50 } });
      return (data.items ?? []) as any[];
    },
  });

  const tags = useMemo(() => {
    const set = new Set<string>();
    (q.data ?? []).forEach((x: any) => Array.isArray(x.tags) && x.tags.forEach((t: string) => set.add(String(t))));
    return Array.from(set).sort();
  }, [q.data]);

  return (
    <AppShell
      title="Offerte & Partner"
      subtitle="Selezione rapida: offerte, store e servizi utili per gamer. Alcuni link possono essere affiliati: sostengono il progetto senza costi extra per te."
      right={
        <>
          <Link className="mp-btn-secondary" to="/">Home</Link>
          <Link className="mp-btn-secondary" to="/blog">Guide</Link>
          <Link className="mp-btn-secondary" to="/risorse">Risorse</Link>
          {hasUser ? (
            <button className="mp-btn-primary" onClick={() => dashboardPath && nav(dashboardPath)}>
              Profilo
            </button>
          ) : (
            <>
              <Link className="mp-btn-secondary" to="/login">Accedi</Link>
              <Link className="mp-btn-primary" to="/signup">Crea account</Link>
            </>
          )}
        </>
      }
    >
      <div className="mp-card p-5 mb-6">
        <div className="font-black text-lg">Filtra</div>
        <div className="mt-3 flex flex-col md:flex-row gap-3">
          <select
            className="mp-input"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            <option value="">Tutte le categorie</option>
            {tags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div className="text-slate-400 text-sm flex-1">
            Seleziona una categoria per trovare subito quello che ti interessa.
          </div>
        </div>
      </div>

      {q.isLoading && <div className="mp-card p-6">Caricamento offerte…</div>}
      {q.error && (
        <div className="mp-card p-6 border border-red-500/30">
          <div className="font-black text-red-200">Impossibile caricare le offerte</div>
          <div className="text-slate-300 mt-1 text-sm">{String((q.error as any).message || q.error)}</div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {(q.data ?? []).map((x: any) => (
          <AffiliateBox
            key={x.slug}
            slug={x.slug}
            titleOverride={x.title}
            subtitle="Apri l’offerta e torna qui: aggiorniamo la selezione in base alle preferenze reali della community."
            utm={{ utm_source: 'modenaplay', utm_medium: 'offers', utm_campaign: tag || 'all' }}
            pagePath={loc.pathname}
          />
        ))}
      </div>

      <div className="mt-10 mp-card p-6">
        <div className="font-black text-xl">Vuoi ricevere solo le offerte migliori?</div>
        <p className="text-slate-300 mt-2">
          Iscriviti alla newsletter: una mail a settimana con guide utili + offerte selezionate (zero spam).
        </p>
        <Link className="mp-btn-primary mt-4 inline-flex" to="/signup">Crea account e salva preferiti</Link>
      </div>
    </AppShell>
  );
}
