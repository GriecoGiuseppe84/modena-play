import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { usePageView } from '../hooks/usePageView';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

function buildResolveUrl(
  slug: string,
  pagePath?: string,
  utm?: Partial<Record<'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term', string>>
) {
  const params = new URLSearchParams();
  params.set('redirect', '1');
  if (pagePath) params.set('p', pagePath);
  const u = utm || {};
  if (u.utm_source) params.set('utm_source', u.utm_source);
  if (u.utm_medium) params.set('utm_medium', u.utm_medium);
  if (u.utm_campaign) params.set('utm_campaign', u.utm_campaign);
  if (u.utm_content) params.set('utm_content', u.utm_content);
  if (u.utm_term) params.set('utm_term', u.utm_term);
  return `/r/${encodeURIComponent(slug)}?${params.toString()}`;
}

export default function HomePage() {
  usePageView('Home');
  const nav = useNavigate();
  const { token, kind, role } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subMsg, setSubMsg] = useState<string | null>(null);

  const offers = useQuery({
    queryKey: ['home-offers'],
    queryFn: async () => (await api.get('/api/affiliate/public/links', { params: { limit: 6 } })).data,
  });

  const trending = useQuery({
    queryKey: ['trending-home'],
    queryFn: async () => (await api.get('/api/public/trending', { params: { days: 7 } })).data,
  });

  const onSubscribe = async () => {
    setSubMsg(null);
    const e = email.trim();
    if (!e) return setSubMsg('Inserisci una email valida.');
    setSubmitting(true);
    try {
      await api.post('/api/public/subscribe', { email: e });
      setSubMsg('Fatto! Ti abbiamo iscritto.');
      setEmail('');
    } catch (err: any) {
      setSubMsg(String(err?.message || 'Errore iscrizione'));
    } finally {
      setSubmitting(false);
    }
  };
  const hasUser = useMemo(() => Boolean(token), [token]);
  const dashboardPath = useMemo(() => {
    if (!token) return null;
    if (kind === 'admin') return '/admin/dashboard';
    return role === 'seller' ? '/seller/dashboard' : '/user/dashboard';
  }, [token, kind, role]);

  return (
    <AppShell
      title="Modena Play"
      subtitle="Offerte gaming, guide pratiche e risorse utili: selezionate per farti risparmiare tempo e soldi. Registrati per salvare preferiti e ricevere la selezione settimanale."
      right={
        <>
          <Link className="mp-btn-secondary" to="/offerte">Offerte</Link>
          <Link className="mp-btn-secondary" to="/blog">Guide</Link>
          <Link className="mp-btn-secondary" to="/risorse">Risorse</Link>
          {hasUser ? (
            <button
              className="mp-btn-primary"
              onClick={() => dashboardPath && nav(dashboardPath)}
            >
              Vai al tuo profilo
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
      <section className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="mp-card p-6 md:p-7">
          <div className="mp-badge text-modena-cyan border-modena-cyan/30 bg-modena-cyan/10">🔎 Selezione curata</div>
          <h2 className="mt-3 text-2xl md:text-3xl font-black">Offerte e guide gaming: solo quello che serve davvero.</h2>
          <p className="mt-2 text-slate-300">
            Un portale “magazine + deals”: raccogliamo offerte affidabili (keys, abbonamenti, hardware &amp; gear) e le accompagniamo con guide pratiche.
            Registrandoti puoi salvare preferiti e ricevere una selezione settimanale.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button className="mp-btn-primary" onClick={() => nav('/signup')}>Crea account</button>
            <button className="mp-btn-secondary" onClick={() => nav('/offerte')}>Sfoglia offerte</button>
            <button className="mp-btn-secondary" onClick={() => nav('/blog')}>Leggi guide</button>
            {hasUser && dashboardPath && (
              <button className="mp-btn-secondary" onClick={() => nav(dashboardPath)}>
                Vai al tuo profilo
              </button>
            )}
          </div>

          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            <div className="mp-card-soft p-4">
              <div className="text-sm font-semibold">Offerte verificate</div>
              <div className="text-xs text-slate-400 mt-1">Link chiari e sempre aggiornati.</div>
            </div>
            <div className="mp-card-soft p-4">
              <div className="text-sm font-semibold">Guide utili</div>
              <div className="text-xs text-slate-400 mt-1">Scelte smart: cosa comprare e perché.</div>
            </div>
            <div className="mp-card-soft p-4">
              <div className="text-sm font-semibold">Preferiti</div>
              <div className="text-xs text-slate-400 mt-1">Salva ciò che ti interessa (account).</div>
            </div>
          </div>

          <div className="mt-5 text-xs text-slate-500">
            Trasparenza: alcuni link possono essere affiliati. Per te il prezzo non cambia, a noi aiuta a mantenere il progetto online.
          </div>
        </div>

        <div className="space-y-4">
          <div className="mp-card p-6">
            <h3 className="text-lg font-black">Perché registrarsi</h3>
            <ul className="mt-3 text-sm text-slate-300 space-y-2 list-disc list-inside">
              <li>Salvi preferiti e torni al volo sulle offerte.</li>
              <li>Ricevi la newsletter settimanale (solo selezione, zero spam).</li>
              <li>In arrivo: avvisi su prezzo e nuove promo (wishlist).</li>
            </ul>
            <div className="mt-4 text-xs text-slate-400">
              Obiettivo: un portale italiano “deals + magazine” con strumenti semplici (wishlist/alert) e contenuti brevi che fanno scegliere meglio.
            </div>
          </div>

          <div className="mp-card p-6">
            <h3 className="text-lg font-black">Cosa trovi su Modena Play</h3>
            <div className="mt-3 grid sm:grid-cols-3 gap-3">
              <div className="mp-card-soft p-4">
                <div className="text-xs text-slate-400">Deals</div>
                <div className="text-lg font-black mt-1">Keys &amp; abbonamenti</div>
                <div className="text-xs text-slate-400 mt-1">Sconti e promo selezionate.</div>
              </div>
              <div className="mp-card-soft p-4">
                <div className="text-xs text-slate-400">Hardware</div>
                <div className="text-lg font-black mt-1">Gear &amp; accessori</div>
                <div className="text-xs text-slate-400 mt-1">Mouse, cuffie, controller.</div>
              </div>
              <div className="mp-card-soft p-4">
                <div className="text-xs text-slate-400">Guide</div>
                <div className="text-lg font-black mt-1">Scelte smart</div>
                <div className="text-xs text-slate-400 mt-1">Come comprare meglio.</div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="mt-6 grid lg:grid-cols-3 gap-5 items-start">
        <div className="mp-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-slate-400">In evidenza</div>
              <h3 className="mt-1 text-xl font-black">Offerte consigliate</h3>
              <p className="text-slate-300 mt-2 text-sm">
                Una selezione rapida: store e servizi utili per gamer. Aggiorniamo la lista in base a ciò che interessa davvero.
              </p>
            </div>
            <Link className="mp-btn-secondary whitespace-nowrap" to="/offerte">Vedi tutte</Link>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-3">
            {(offers.data?.items ?? []).slice(0, 6).map((x: any) => (
              <a
                key={x.slug}
                href={buildResolveUrl(String(x.slug), window.location.pathname, {
                  utm_source: 'modenaplay',
                  utm_medium: 'home',
                  utm_campaign: 'featured',
                })}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 hover:bg-slate-950/70 transition"
              >
                <div className="text-xs uppercase tracking-wide text-slate-400">{x.brand_name || 'Partner'}</div>
                <div className="font-semibold mt-1">{x.title}</div>
                {Array.isArray(x.tags) && x.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {x.tags.slice(0, 5).map((t: string) => (
                      <span key={t} className="mp-badge border-slate-700 bg-slate-900/40">{t}</span>
                    ))}
                  </div>
                )}
              </a>
            ))}
            {offers.isLoading && <div className="text-slate-400 text-sm">Caricamento offerte…</div>}
            {offers.error && <div className="text-slate-400 text-sm">Offerte non disponibili al momento.</div>}
          </div>
        </div>

        <div className="mp-card p-6">
          <div className="mp-badge text-modena-gold border-modena-gold/30 bg-modena-gold/10">Newsletter</div>
          <h3 className="mt-3 text-xl font-black">Ricevi la selezione “solo roba utile”</h3>
          <p className="text-slate-300 mt-2 text-sm">Una mail a settimana: offerte top + guide brevi. Niente spam.</p>

          <div className="mt-4 flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="la tua email"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2"
            />
            <button className="mp-btn-primary" onClick={onSubscribe} disabled={submitting}>
              {submitting ? '…' : 'Iscrivimi'}
            </button>
          </div>
          {subMsg && <div className="mt-3 text-sm text-slate-300">{subMsg}</div>}
          <div className="mt-4 text-xs text-slate-500">Disiscrizione con 1 click.</div>
        </div>
      </section>

      <section className="mt-6 mp-card p-6">
        <div className="text-sm text-slate-400">Trending</div>
        <h3 className="mt-1 text-xl font-black">Guide più lette (ultimi 7 giorni)</h3>
        <p className="text-slate-300 mt-2 text-sm">Le guide che stanno aiutando di più la community in questo momento.</p>

        <div className="mt-4 grid md:grid-cols-3 gap-3">
          {(trending.data?.trendingPosts ?? []).slice(0, 6).map((p: any) => (
            <Link
              key={p.id}
              to={`/blog/${p.slug}`}
              className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 hover:bg-slate-950/70 transition"
            >
              <div className="font-semibold">{p.title}</div>
              <div className="text-xs text-slate-400 mt-2">{p.views} letture • {p.clicks} click</div>
            </Link>
          ))}
          {(!trending.data?.trendingPosts || trending.data.trendingPosts.length === 0) && (
            <div className="text-slate-400 text-sm">Nessun dato trending ancora: pubblica i primi articoli e genera traffico.</div>
          )}
        </div>
      </section>

      <div className="mt-10 text-xs text-slate-500">© 2026 Modena Play · Portale offerte & guide gaming</div>
    </AppShell>
  );
}
