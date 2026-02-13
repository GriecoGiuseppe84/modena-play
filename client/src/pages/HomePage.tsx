import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { usePageView } from '../hooks/usePageView';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  usePageView('Home');
  const nav = useNavigate();
  const { token, kind, role } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subMsg, setSubMsg] = useState<string | null>(null);

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

  return (
    <AppShell
      title="Modena Play"
      subtitle={'Gaming "safe":offerte su keys/abbonamenti, hardware & gear, usato-refurb e sconti Steam. Guide in stile magazine. Iscriviti per ricevere selezioni settimanali."}
      right={
        <>
          <Link className="mp-btn-secondary" to="/offerte">Offerte</Link>
          <Link className="mp-btn-secondary" to="/blog">Blog</Link>
          <Link className="mp-btn-secondary" to="/risorse">Risorse</Link>
          <Link className="mp-btn-secondary" to="/login">Accedi</Link>
          <Link className="mp-btn-secondary" to="/admin/login">Admin</Link>
          <Link className="mp-btn-primary" to="/signup">Crea account</Link>
        </>
      }
    >
      <section className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="mp-card p-6 md:p-7">
          <div className="mp-badge text-modena-cyan border-modena-cyan/30 bg-modena-cyan/10">✨ MVP pronto</div>
          <h2 className="mt-3 text-2xl md:text-3xl font-black">
            Autenticazione solida + Playbook di lancio.
          </h2>
          <p className="mt-2 text-slate-300">
            Login/Signup con password, recupero password e dashboard per ruolo. Dentro trovi una presentazione guidata (checklist + roadmap)
            per trasformare ModenaGiochi in un progetto che converte.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button className="mp-btn-primary" onClick={() => nav('/signup')}>Inizia ora</button>
            <button className="mp-btn-secondary" onClick={() => nav('/login')}>Ho già un account</button>
            <button className="mp-btn-secondary" onClick={() => nav('/admin/login')}>Accesso Admin</button>
            {hasUser && (
              <button
                className="mp-btn-secondary"
                onClick={() => {
                  if (kind === 'admin') nav('/admin/dashboard');
                  else nav(role === 'seller' ? '/seller/dashboard' : '/user/dashboard');
                }}
              >
                Vai alla dashboard
              </button>
            )}
          </div>

          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            <div className="mp-card-soft p-4">
              <div className="text-sm font-semibold">Affiliate Hub</div>
              <div className="text-xs text-slate-400 mt-1">Contenuti + link che convertono.</div>
            </div>
            <div className="mp-card-soft p-4">
              <div className="text-sm font-semibold">Tracking</div>
              <div className="text-xs text-slate-400 mt-1">Misura traffico e click, senza frizioni.</div>
            </div>
            <div className="mp-card-soft p-4">
              <div className="text-sm font-semibold">Scale</div>
              <div className="text-xs text-slate-400 mt-1">Marketplace solo quando conviene.</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="mp-card p-6">
            <h3 className="text-lg font-black">Cosa puoi fare subito</h3>
            <ul className="mt-3 text-sm text-slate-300 space-y-2 list-disc list-inside">
              <li>Creare account e accedere (User / Seller)</li>
              <li>Recuperare password via email (Supabase Auth)</li>
              <li>Seguire il Playbook con checklist (salvata nel browser)</li>
            </ul>
            <div className="mt-4 text-xs text-slate-400">
              Le funzioni DB/analytics avanzate sono modulari: si attivano senza bloccare il portale.
            </div>
          </div>

          <div className="mp-card p-6">
            <h3 className="text-lg font-black">Obiettivo (realistico)</h3>
            <div className="mt-3 grid sm:grid-cols-3 gap-3">
              <div className="mp-card-soft p-4">
                <div className="text-xs text-slate-400">Mese 1</div>
                <div className="text-lg font-black mt-1">€0–50</div>
                <div className="text-xs text-slate-400 mt-1">Setup + 10 articoli.</div>
              </div>
              <div className="mp-card-soft p-4">
                <div className="text-xs text-slate-400">Mese 3</div>
                <div className="text-lg font-black mt-1">€230–560</div>
                <div className="text-xs text-slate-400 mt-1">SEO inizia a spingere.</div>
              </div>
              <div className="mp-card-soft p-4">
                <div className="text-xs text-slate-400">Mese 6</div>
                <div className="text-lg font-black mt-1">€750–1.600</div>
                <div className="text-xs text-slate-400 mt-1">Con costanza + contenuti.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

<section className="mt-6 grid lg:grid-cols-3 gap-5 items-start">
  <div className="mp-card p-6 lg:col-span-2">
    <div className="text-sm text-slate-400">Trending</div>
    <h3 className="mt-1 text-xl font-black">Le guide più viste degli ultimi 7 giorni</h3>
    <p className="text-slate-300 mt-2 text-sm">
      Qui trovi quello che sta interessando di più la community. È anche il posto giusto per mettere i link affiliati “che pagano”.
    </p>

    <div className="mt-4 grid md:grid-cols-2 gap-3">
      {(trending.data?.trendingPosts ?? []).slice(0, 6).map((p: any) => (
        <Link key={p.id} to={`/blog/${p.slug}`} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-950/70">
          <div className="font-semibold">{p.title}</div>
          <div className="text-xs text-slate-400 mt-1">{p.views} views • {p.clicks} click</div>
        </Link>
      ))}
      {(!trending.data?.trendingPosts || trending.data.trendingPosts.length === 0) && (
        <div className="text-slate-400 text-sm">Nessun dato trending ancora: pubblica i primi articoli e genera traffico.</div>
      )}
    </div>
  </div>

  <div className="mp-card p-6">
    <div className="mp-badge text-modena-gold border-modena-gold/30 bg-modena-gold/10">Newsletter</div>
    <h3 className="mt-3 text-xl font-black">Ricevi la selezione “solo roba utile”</h3>
    <p className="text-slate-300 mt-2 text-sm">
      Una mail a settimana: guide top, offerte solide e strumenti per scegliere bene (solo gaming).
    </p>

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
</section>

      <div className="mt-10 text-xs text-slate-500">© 2026 Modena Play · MVP</div>
    </AppShell>
  );
}
