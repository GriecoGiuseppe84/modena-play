import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { api } from '../services/api';

type PublicLink = {
  id: string;
  title: string;
  slug: string;
  network: string;
  category: string;
  tags: string[];
  description: string;
  click_count: number;
  created_at: string;
};

type MetaItem = { key: string; count: number };
type Meta = {
  categories: MetaItem[];
  networks: MetaItem[];
  tags: MetaItem[];
};

function clamp(v: string, n = 140) {
  const s = String(v || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function badgeForNetwork(n: string) {
  const k = String(n || 'generic').toLowerCase();
  if (k === 'amazon') return 'Amazon';
  if (k === 'ebay') return 'eBay';
  if (k === 'steam') return 'Steam';
  if (k === 'kickstarter') return 'Kickstarter';
  return k || 'generic';
}

export default function ResourcesPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [top, setTop] = useState<PublicLink[]>([]);
  const [fresh, setFresh] = useState<PublicLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [network, setNetwork] = useState('');
  const [tag, setTag] = useState('');

  const hasFilters = useMemo(() => Boolean(q.trim() || category || network || tag), [q, category, network, tag]);

  async function loadAll() {
    setLoading(true);
    try {
      setError(null);

      const [rMeta, rTop, rNew] = await Promise.all([
        api.get('/api/affiliate/public/meta', { timeout: 8000 }),
        api.get('/api/affiliate/public/links', {
          params: { sort: 'top', limit: 12, q: q.trim() || undefined, category: category || undefined, network: network || undefined, tag: tag || undefined },
          timeout: 9000,
        }),
        api.get('/api/affiliate/public/links', {
          params: { sort: 'new', limit: 10, q: q.trim() || undefined, category: category || undefined, network: network || undefined, tag: tag || undefined },
          timeout: 9000,
        }),
      ]);

      setMeta(rMeta.data ?? null);
      setTop(rTop.data?.items ?? []);
      setFresh(rNew.data?.items ?? []);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Errore caricamento risorse';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload when filters change (debounced)
  useEffect(() => {
    const t = setTimeout(() => loadAll(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, network, tag]);

  const categories = useMemo(() => (meta?.categories ?? []).slice(0, 10), [meta]);
  const tags = useMemo(() => (meta?.tags ?? []).slice(0, 12), [meta]);
  const networks = useMemo(() => (meta?.networks ?? []).slice(0, 10), [meta]);

  return (
    <AppShell
      title="Risorse"
      subtitle="Una selezione curata di giochi, espansioni e strumenti. Ogni click supporta Modena Play (senza costi extra)."
      right={
        <>
          <Link className="mp-btn-secondary" to="/login">Accedi</Link>
          <Link className="mp-btn-primary" to="/signup">Crea account</Link>
        </>
      }
    >
      {/* HERO marketing */}
      <section className="mp-card p-6 md:p-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 mp-badge mb-3">
              <span className="h-2 w-2 rounded-full bg-modena-cyan" />
              Selezione aggiornata
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
              Scopri i migliori prodotti gaming, già filtrati per te.
            </h1>
            <p className="mt-3 text-slate-300">
              Niente articoli “acchiappa-click”: qui trovi solo risorse utili per giocare meglio, spendere con criterio e trovare le offerte giuste.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="mp-badge">📈 Top cliccati</span>
              <span className="mp-badge">🆕 Nuovi arrivi</span>
              <span className="mp-badge">🎯 Filtri smart</span>
              <span className="mp-badge">🔗 Link tracciati</span>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link className="mp-btn-primary" to={top[0]?.slug ? `/r/${top[0].slug}` : '#'} onClick={(e) => { if (!top[0]?.slug) e.preventDefault(); }}>
                Vai al consiglio #1
              </Link>
              <a className="mp-btn-secondary" href="#catalogo">Esplora catalogo</a>
            </div>
          </div>

          <div className="w-full lg:w-[420px]">
            <div className="mp-card-soft p-4">
              <div className="text-sm text-slate-300 mb-2">Trova in 10 secondi</div>
              <input
                className="mp-input"
                placeholder="Cerca (es. Catan, Warhammer, D&D, Magic…) "
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Categoria</label>
                  <select className="mp-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">Tutte</option>
                    {categories.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.key} ({c.count})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Network</label>
                  <select className="mp-input" value={network} onChange={(e) => setNetwork(e.target.value)}>
                    <option value="">Tutti</option>
                    {networks.map((n) => (
                      <option key={n.key} value={n.key}>
                        {badgeForNetwork(n.key)} ({n.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs text-slate-400 mb-2">Tag popolari</label>
                <div className="flex flex-wrap gap-2">
                  <button className={"mp-badge " + (!tag ? "border-modena-cyan/40" : "")} onClick={() => setTag('')} type="button">
                    Tutti
                  </button>
                  {tags.map((t) => (
                    <button
                      key={t.key}
                      className={"mp-badge " + (tag === t.key ? "border-modena-cyan/40" : "")}
                      onClick={() => setTag(t.key)}
                      type="button"
                      title={`${t.count} risorse`}
                    >
                      #{t.key}
                    </button>
                  ))}
                </div>
              </div>

              {hasFilters && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Filtri attivi</span>
                  <button className="mp-btn-secondary" onClick={() => { setQ(''); setCategory(''); setNetwork(''); setTag(''); }} type="button">
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-red-300">{error}</div>}
        {loading && <div className="mt-4 text-sm text-slate-400">Carico risorse…</div>}
      </section>

      {/* Featured sections */}
      <section id="catalogo" className="mt-8 grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="flex items-end justify-between gap-4 mb-3">
            <h2 className="text-xl font-bold">Top consigliati</h2>
            <span className="text-xs text-slate-400">Selezione basata su click e qualità</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {top.map((l) => (
              <a key={l.id} href={`/r/${l.slug}`} className="mp-card p-4 hover:bg-white/10 transition">
                <div className="flex items-center justify-between gap-2">
                  <span className="mp-badge">{badgeForNetwork(l.network)}</span>
                  <span className="text-xs text-slate-400">{l.click_count} click</span>
                </div>
                <div className="mt-3 text-lg font-semibold">{l.title}</div>
                <div className="mt-2 text-sm text-slate-300">{clamp(l.description || 'Risorsa selezionata da Modena Play')}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {l.category && <span className="mp-badge">📁 {l.category}</span>}
                  {(l.tags ?? []).slice(0, 3).map((t) => (
                    <span key={t} className="mp-badge">#{t}</span>
                  ))}
                </div>

                <div className="mt-4 inline-flex items-center gap-2 text-modena-cyan font-semibold">
                  Apri →
                </div>
              </a>
            ))}
            {!loading && !error && top.length === 0 && (
              <div className="text-sm text-slate-400 mp-card p-4 sm:col-span-2">
                Nessun risultato con questi filtri. Prova a rimuovere un filtro o usa una keyword diversa.
              </div>
            )}
          </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="mp-card p-4">
            <h3 className="text-lg font-bold">Novità & trend</h3>
            <p className="text-sm text-slate-300 mt-1">
              Ultimi link inseriti (ottimi per scoprire nuovi titoli e offerte).
            </p>

            <div className="mt-4 flex flex-col gap-3">
              {fresh.slice(0, 7).map((l) => (
                <a key={l.id} href={`/r/${l.slug}`} className="mp-card-soft p-3 hover:bg-white/10 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{clamp(l.title, 44)}</span>
                    <span className="text-xs text-slate-400">{badgeForNetwork(l.network)}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{l.category || 'Risorsa'}</div>
                </a>
              ))}
              {!loading && !error && fresh.length === 0 && (
                <div className="text-sm text-slate-400">Nessuna novità disponibile.</div>
              )}
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
              <h4 className="text-sm font-semibold">Trasparenza</h4>
              <p className="text-xs text-slate-400 mt-1">
                Alcuni link possono essere affiliati: tu paghi uguale, noi riceviamo una piccola commissione che finanzia il progetto.
              </p>
            </div>
          </div>
        </aside>
      </section>

      {/* CTA bottom */}
      <section className="mt-10 mp-card p-6 md:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-lg font-bold">Vuoi una selezione ancora più personalizzata?</div>
          <div className="text-sm text-slate-300 mt-1">
            Crea un account e salva i tuoi preferiti. Poi, quando avrai trazione, potrai passare a marketplace.
          </div>
        </div>
        <div className="flex gap-3">
          <Link className="mp-btn-secondary" to="/">Torna alla Home</Link>
          <Link className="mp-btn-primary" to="/signup">Crea account</Link>
        </div>
      </section>
    </AppShell>
  );
}
