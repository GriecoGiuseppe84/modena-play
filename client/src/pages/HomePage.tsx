import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePageView } from '../hooks/usePageView';

export default function HomePage() {
  usePageView('Home');
  const nav = useNavigate();
  const { token, kind, role } = useAuth();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subMsg, setSubMsg] = useState<string | null>(null);

  const hasUser = useMemo(() => Boolean(token), [token]);
  const dashboardPath = useMemo(() => {
    if (!token) return null;
    if (kind === 'admin') return '/admin/dashboard';
    return role === 'seller' ? '/seller/dashboard' : '/user/dashboard';
  }, [token, kind, role]);

  const trending = useQuery({
    queryKey: ['trending-home'],
    queryFn: async () => (await api.get('/api/public/trending', { params: { days: 7 } })).data,
  });

  const offers = useQuery({
    queryKey: ['home-offers'],
    queryFn: async () => {
      const { data } = await api.get('/api/affiliate/public/links', { params: { limit: 6 } });
      return (data.items ?? []) as any[];
    },
  });

  const buildGo = (slug: string) => {
    const params = new URLSearchParams();
    params.set('redirect', '1');
    params.set('p', '/');
    params.set('utm_source', 'modenaplay');
    params.set('utm_medium', 'home');
    params.set('utm_campaign', 'featured');
    return `/r/${encodeURIComponent(slug)}?${params.toString()}`;
  };

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

  return (
    <AppShell
      title="Modena Play"
      subtitle="Offerte gaming, guide pratiche e risorse utili: selezionate per farti risparmiare tempo e soldi. Iscriviti per ricevere la selezione settimanale."
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
          <div className="mp-badge text-modena-cyan border-modena-cyan/30 bg-modena-cyan/10">🎮 Gaming safe</div>
          <h2 className="mt-3 text-2xl md:text-3xl font-black">Offerte e guide per comprare bene.</h2>
          <p className="mt-2 text-slate-300">
            Modena Play seleziona offerte, store e risorse utili per gamer. In più trovi guide pratiche (setup, hardware, abbonamenti)
            in stile magazine.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button className="mp-btn-primary" onClick={() => nav('/offerte')}>Guarda le offerte</button>
            {!hasUser ? (
              <>
                <button className="mp-btn-secondary" onClick={() => nav('/signup')}>Crea account</button>
                <button className="mp-btn-secondary" onClick={() => nav('/login')}>Accedi</button>
              </>
            ) : (
              <button className="mp-btn-secondary" onClick={() => dashboardPath && nav(dashboardPath)}>
                Apri il profilo
              </button>
            )}
          </div>

          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            <div className="mp-card-soft p-4">
              <div className="text-sm font-semibold">Offerte selezionate</div>
              <div className="text-xs text-slate-400 mt-1">Solo partner utili, niente spam.</div>
            </div>
            <div className="mp-card-soft p-4">
              <div className="text-sm font-semibold">Guide pratiche</div>
              <div className="text-xs text-slate-400 mt-1">Consigli chiari, zero fuffa.</div>
            </div>
            <div className="mp-card-soft p-4">
              <div className="text-sm font-semibold">Preferiti</div>
              <div className="text-xs text-slate-400 mt-1">Salva le guide che ti servono.</div>
            </div>
          </div>

          <div className="mt-5 text-xs text-slate-500">
            Nota: alcuni link sono affiliati (sostengono il progetto). Le selezioni restano indipendenti.
          </div>
        </div>

        <div className="space-y-4">
          <div className="mp-card p-6">
            <h3 className="text-lg font-black">In evidenza</h3>
            <p className="mt-2 text-sm text-slate-300">
              Una manciata di partner utili, aggiornati di frequente. Vuoi tutto? Vai su Offerte.
            </p>

            <div className="mt-4 grid gap-3">
              {(offers.data ?? []).slice(0, 4).map((x: any) => (
                <a
                  key={x.slug}
                  href={buildGo(x.slug)}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 hover:bg-slate-950/70"
                >
                  <div className="text-xs uppercase tracking-wide text-slate-400">{x.brand_name || 'Partner'}</div>
                  <div className="font-black mt-1">{x.title}</div>
                  {Array.isArray(x.tags) && x.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {x.tags.slice(0, 4).map((t: string) => (
                        <span key={t} className="mp-badge border-slate-700 bg-slate-900/40">{t}</span>
                      ))}
                    </div>
                  )}
                </a>
              ))}
              {offers.isLoading && <div className="text-sm text-slate-300">Caricamento offerte…</div>}
              {offers.error && <div className="text-sm text-slate-300">Impossibile caricare le offerte.</div>}
            </div>

            <div className="mt-4">
              <Link className="mp-btn-secondary" to="/offerte">Vedi tutte le offerte</Link>
            </div>
          </div>

          <div className="mp-card p-6">
            <div className="mp-badge text-modena-gold border-modena-gold/30 bg-modena-gold/10">Newsletter</div>
            <h3 className="mt-3 text-xl font-black">Ricevi la selezione settimanale</h3>
            <p className="text-slate-300 mt-2 text-sm">Una mail a settimana: guide top + offerte selezionate. Zero spam.</p>

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
            <div className="mt-4 text-xs text-slate-500">Niente spam. Disiscrizione con 1 click.</div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid lg:grid-cols-3 gap-5 items-start">
        <div className="mp-card p-6 lg:col-span-2">
          <div className="text-sm text-slate-400">Trending</div>
          <h3 className="mt-1 text-xl font-black">Guide più viste (ultimi 7 giorni)</h3>
          <p className="text-slate-300 mt-2 text-sm">Se vuoi orientarti al volo, parti da qui.</p>

          <div className="mt-4 grid md:grid-cols-2 gap-3">
            {(trending.data?.trendingPosts ?? []).slice(0, 6).map((p: any) => (
              <Link
                key={p.id}
                to={`/blog/${p.slug}`}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-950/70"
              >
                <div className="font-semibold">{p.title}</div>
                <div className="text-xs text-slate-400 mt-1">{p.views} views • {p.clicks} click</div>
              </Link>
            ))}
            {(!trending.data?.trendingPosts || trending.data.trendingPosts.length === 0) && (
              <div className="text-slate-400 text-sm">Nessun dato trending ancora: pubblica i primi articoli e genera traffico.</div>
            )}
          </div>

          <div className="mt-4">
            <Link className="mp-btn-secondary" to="/blog">Vai alle guide</Link>
          </div>
        </div>

        <div className="mp-card p-6">
          <h3 className="text-lg font-black">Perché registrarsi</h3>
          <ul className="mt-3 text-sm text-slate-300 space-y-2 list-disc list-inside">
            <li>Salvi le guide preferite</li>
            <li>Accedi a strumenti e sezioni in crescita</li>
            <li>Ricevi la selezione settimanale</li>
          </ul>
          <div className="mt-4 flex gap-2">
            <Link className="mp-btn-primary" to="/signup">Crea account</Link>
            <Link className="mp-btn-secondary" to="/login">Accedi</Link>
          </div>
        </div>
      </section>

      <div className="mt-10 text-xs text-slate-500">© 2026 Modena Play</div>
    </AppShell>
  );
}
