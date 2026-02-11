import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppShell from '../components/AppShell';
import { api } from '../services/api';
import { usePageView } from '../hooks/usePageView';
import { useAuth } from '../context/AuthContext';

function clamp(s: string, n: number) {
  const t = String(s || '');
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

export default function Blog() {
  usePageView('Blog');
  const { token } = useAuth();
  const [q, setQ] = useState('');
  const [onlyTrending, setOnlyTrending] = useState(false);

  const postsQ = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data } = await api.get('/api/content/posts', { params: { limit: 50, offset: 0 } });
      return (data.items ?? []) as any[];
    },
  });

  const trendingQ = useQuery({
    queryKey: ['trending'],
    queryFn: async () => {
      const { data } = await api.get('/api/public/trending', { params: { days: 7 } });
      return data as any;
    },
  });

  const favoritesQ = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      if (!token) return { items: [] };
      const { data } = await api.get('/api/user/favorites/posts');
      return data as any;
    },
    enabled: Boolean(token),
  });

  const favSet = useMemo(() => new Set((favoritesQ.data?.items ?? []).map((x: any) => x.id)), [favoritesQ.data]);

  const toggleFav = async (slug: string) => {
    if (!token) return;
    await api.post('/api/user/favorites/posts/toggle', { slug });
    await favoritesQ.refetch();
  };

  const list = useMemo(() => {
    const all = postsQ.data ?? [];
    const trending = new Set((trendingQ.data?.trendingPosts ?? []).map((p: any) => p.slug));
    const base = onlyTrending ? all.filter((p) => trending.has(p.slug)) : all;

    const qq = q.trim().toLowerCase();
    if (!qq) return base;
    return base.filter((p) => String(p.title || '').toLowerCase().includes(qq) || String(p.excerpt || '').toLowerCase().includes(qq));
  }, [postsQ.data, trendingQ.data, q, onlyTrending]);

  return (
    <AppShell
      title="Blog & Guide"
      subtitle="Guide pratiche, comparazioni e consigli per comprare bene (e giocare meglio). Zero fuffa: solo contenuti utili e aggiornati."
      right={
        <>
          <Link className="mp-btn-secondary" to="/">Home</Link>
          <Link className="mp-btn-secondary" to="/login">Accedi</Link>
          <Link className="mp-btn-primary" to="/signup">Crea account</Link>
        </>
      }
    >
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="mp-card p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div>
              <div className="text-sm text-slate-400">Scorciatoia</div>
              <div className="text-xl font-black">Trova subito la guida giusta</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cerca (es. 'PS5', 'controller', 'Warhammer', 'Steam Deck')"
                className="w-full md:w-[360px] rounded-xl bg-slate-950 border border-slate-800 px-3 py-2"
              />
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={onlyTrending} onChange={(e) => setOnlyTrending(e.target.checked)} />
                Solo trending
              </label>
            </div>
          </div>

          {postsQ.isLoading && <div className="mt-5 text-slate-300">Caricamento…</div>}
          {postsQ.error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
              Errore nel caricamento: {String((postsQ.error as any)?.message || postsQ.error)}
            </div>
          )}

          <div className="mt-5 grid md:grid-cols-2 gap-4">
            {list.map((p: any) => (
              <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 hover:bg-slate-950/70">
                {p.hero_image_url && (
                  <img src={p.hero_image_url} alt={p.title} className="w-full h-40 object-cover rounded-xl border border-slate-800 mb-3" />
                )}
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/blog/${p.slug}`} className="font-black text-lg leading-tight hover:underline">
                    {p.title}
                  </Link>

                  <button
                    className={
                      'text-sm rounded-xl px-3 py-2 border ' +
                      (favSet.has(p.id) ? 'border-modena-gold/40 bg-modena-gold/10 text-modena-gold' : 'border-slate-700 bg-slate-900/40 text-slate-200')
                    }
                    disabled={!token}
                    title={token ? 'Salva nei preferiti' : 'Accedi per usare i preferiti'}
                    onClick={() => toggleFav(p.slug)}
                  >
                    {favSet.has(p.id) ? '★' : '☆'}
                  </button>
                </div>

                {p.excerpt && <p className="text-slate-300 mt-2 text-sm">{clamp(p.excerpt, 160)}</p>}

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>{p.published_at ? new Date(p.published_at).toLocaleDateString('it-IT') : '—'}</span>
                  <Link className="underline" to={`/blog/${p.slug}`}>
                    Leggi →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="mp-card p-5">
            <div className="font-black text-lg">Perché registrarsi</div>
            <ul className="mt-3 text-sm text-slate-300 space-y-2">
              <li>• Salvi guide e offerte nei preferiti.</li>
              <li>• Ricevi una mail settimanale con le migliori selezioni.</li>
              <li>• In arrivo: voti, recensioni rapide e “trending” personalizzato.</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <Link className="mp-btn-primary" to="/signup">Crea account</Link>
              <Link className="mp-btn-secondary" to="/login">Accedi</Link>
            </div>
          </div>

          <div className="mp-card p-5">
            <div className="font-black text-lg">Trending 7 giorni</div>
            <div className="mt-3 space-y-3">
              {(trendingQ.data?.trendingPosts ?? []).slice(0, 5).map((p: any) => (
                <Link key={p.id} to={`/blog/${p.slug}`} className="block rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-950/70">
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {p.views} views • {p.clicks} click
                  </div>
                </Link>
              ))}
              {(!trendingQ.data?.trendingPosts || trendingQ.data.trendingPosts.length === 0) && (
                <div className="text-slate-400 text-sm">Nessun trending disponibile (inizia pubblicando 3-5 articoli).</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
