import React, { useMemo } from 'react';
import useLocalStorageState from '../hooks/useLocalStorageState';

type Item = { id: string; title: string; note?: string };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function OnboardingPlaybook({
  email,
}: {
  email?: string | null;
}) {
  const storageKey = useMemo(() => {
    const suffix = (email ?? '').trim().toLowerCase() || 'anonymous';
    return `mp_onboard_v1:${suffix}`;
  }, [email]);

  const tasksWeek1: Item[] = [
    { id: 'w1-host', title: 'Setup infrastruttura: dominio/hosting (o piattaforma) + pubblicazione', note: 'Obiettivo: sito online + analytics pronti.' },
    { id: 'w1-aff', title: 'Iscrizione programmi affiliate: Amazon + eBay', note: 'Attiva le prime commissioni senza inventario.' },
    { id: 'w1-seo', title: 'Setup SEO base (Search Console + Analytics 4)', note: 'Misura tutto fin da subito.' },
    { id: 'w1-links', title: 'Crea pagina “Risorse” con i primi link affiliate', note: 'Pagina semplice, ma pronta a convertire.' },
  ];

  const pillarArticles: Item[] = [
    { id: 'a1', title: 'Migliori Giochi da Tavolo 2026 (Top 20)' },
    { id: 'a2', title: 'Giochi da Tavolo per 4 Persone: Guida Completa' },
    { id: 'a3', title: 'Migliori Espansioni Magic: The Gathering 2026' },
    { id: 'a4', title: 'Warhammer 40K: Quale Set Base Comprare?' },
    { id: 'a5', title: 'D&D Starter Set: Guida per Principianti' },
    { id: 'a6', title: 'Giochi di Ruolo da Tavolo: Top 20 RPG' },
    { id: 'a7', title: 'Migliori Giochi per Principianti: Zero Esperienza' },
    { id: 'a8', title: 'Card Games Online: Giochi Digitali Gratuiti' },
    { id: 'a9', title: 'Dove Comprare Giochi da Tavolo Online: Guida 2026' },
    { id: 'a10', title: 'Giochi da Tavolo Multiplayer Online: Top 15' },
  ];

  const [state, setState] = useLocalStorageState<Record<string, boolean>>(storageKey, {});

  const allItems = [...tasksWeek1, ...pillarArticles];
  const doneCount = allItems.reduce((acc, it) => acc + (state[it.id] ? 1 : 0), 0);
  const pct = clamp(Math.round((doneCount / Math.max(1, allItems.length)) * 100), 0, 100);

  const Benefit = ({ title, desc }: { title: string; desc: string }) => (
    <div className="mp-card-soft p-4">
      <div className="font-semibold text-slate-100">{title}</div>
      <div className="text-sm text-slate-300 mt-1">{desc}</div>
    </div>
  );

  const CheckRow = ({ it }: { it: Item }) => (
    <label className="flex items-start gap-3 py-2">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-modena-cyan"
        checked={Boolean(state[it.id])}
        onChange={(e) => setState((prev) => ({ ...prev, [it.id]: e.target.checked }))}
      />
      <div>
        <div className="text-sm text-slate-100">{it.title}</div>
        {it.note && <div className="text-xs text-slate-400 mt-1">{it.note}</div>}
      </div>
    </label>
  );

  const promptDraft = `Scrivi un articolo SEO da 2.500 parole su "Migliori Giochi da Tavolo 2026".

Include: Catan, Ticket to Ride, Splendor, Agricola, Azul, King of Tokyo, Pandemic, Carcassonne, 7 Wonders, Dominion.

Per ciascun gioco:
- descrizione (2-3 frasi)
- stats: giocatori, durata, difficoltà, età
- pro/contro
- fascia prezzo
- call-to-action finale (senza link reali)

Chiudi con FAQ (almeno 6 domande) e una tabella comparativa.`;

  return (
    <div className="space-y-6">
      <section className="mp-card p-6 md:p-7">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="mp-badge text-modena-cyan border-modena-cyan/30 bg-modena-cyan/10">
              🚀 CEO thinking
            </div>
            <h2 className="mt-3 text-2xl md:text-3xl font-black">
              Affiliate Marketing è la mossa vincente.
            </h2>
            <p className="mt-2 text-slate-300 max-w-3xl">
              Prima validi l&apos;audience (costo basso, apprendimento veloce), poi — solo se i numeri tornano —
              espandi verso ecommerce/marketplace.
            </p>
          </div>

          <div className="mp-card-soft p-4 w-full md:w-[320px]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Progresso Playbook</div>
              <div className="text-xs text-slate-300">{pct}%</div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-modena-cyan" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {doneCount}/{allItems.length} attività completate (salvate sul browser)
            </div>
            <div className="mt-3 flex gap-2">
              <button
                className="mp-btn-secondary w-full"
                onClick={() => {
                  if (!confirm('Vuoi azzerare il progresso della checklist?')) return;
                  setState({});
                }}
              >
                Reset
              </button>
              <button
                className="mp-btn-primary w-full"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(promptDraft);
                    alert('Prompt copiato negli appunti ✅');
                  } catch {
                    alert('Impossibile copiare. Seleziona e copia manualmente.');
                  }
                }}
              >
                Copia Prompt
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="mp-card p-6">
          <h3 className="text-lg font-black">Perché conviene</h3>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <Benefit title="Validazione mercato" desc="Capisci subito se ModenaGiochi attrae audience interessata." />
            <Benefit title="Capitale minimo" desc="Parti leggero: contenuti + link affiliati, zero inventario." />
            <Benefit title="Break-even veloce" desc="2-3 mesi per i primi segnali, non 6-12 mesi." />
            <Benefit title="Scalabile" desc="Se funziona, aggiungi dropshipping o marketplace dopo, con dati." />
          </div>
        </div>

        <div className="mp-card p-6 lg:col-span-2">
          <h3 className="text-lg font-black">Piano d&apos;azione realistico</h3>
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <div className="mp-card-soft p-4">
              <div className="text-xs uppercase tracking-wider text-slate-400">Settimana 1</div>
              <div className="font-semibold mt-1">Infrastructure</div>
              <div className="text-sm text-slate-300 mt-1">Sito online + SEO/Analytics + prime affiliazioni.</div>
            </div>
            <div className="mp-card-soft p-4">
              <div className="text-xs uppercase tracking-wider text-slate-400">Settimane 2–3</div>
              <div className="font-semibold mt-1">10 pillar articles</div>
              <div className="text-sm text-slate-300 mt-1">Solo contenuti che convertono (top list + guide).</div>
            </div>
            <div className="mp-card-soft p-4">
              <div className="text-xs uppercase tracking-wider text-slate-400">Settimana 4</div>
              <div className="font-semibold mt-1">Traffico + tracking</div>
              <div className="text-sm text-slate-300 mt-1">Search Console, ottimizzazione, prime visite.</div>
            </div>
          </div>

          <details className="mt-4 mp-card-soft p-4">
            <summary className="cursor-pointer font-semibold">Obiettivo economico (stima)</summary>
            <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
              <div className="mp-card-soft p-4">
                <div className="text-xs text-slate-400">Scenario conservativo</div>
                <div className="text-lg font-black mt-1">€300–500/mese</div>
                <div className="text-slate-300 mt-1">~5.000 visite/mese + CTR affiliate 0,5%.</div>
              </div>
              <div className="mp-card-soft p-4">
                <div className="text-xs text-slate-400">Scenario medio</div>
                <div className="text-lg font-black mt-1">€750–1.600/mese</div>
                <div className="text-slate-300 mt-1">8–12k visite/mese entro 6 mesi.</div>
              </div>
              <div className="mp-card-soft p-4">
                <div className="text-xs text-slate-400">Scenario aggressivo</div>
                <div className="text-lg font-black mt-1">€1.000–2.000/mese</div>
                <div className="text-slate-300 mt-1">15–20k visite/mese, mix Amazon + eBay.</div>
              </div>
            </div>
          </details>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="mp-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black">Checklist — Settimana 1</h3>
            <span className="mp-badge">⏱️ 2–3 ore</span>
          </div>
          <div className="mt-3 divide-y divide-white/10">
            {tasksWeek1.map((it) => (
              <CheckRow key={it.id} it={it} />
            ))}
          </div>
        </div>

        <div className="mp-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black">Checklist — 10 articoli killer</h3>
            <span className="mp-badge">✍️ 2–3 settimane</span>
          </div>
          <p className="text-sm text-slate-300 mt-2">
            Scrivi solo articoli che convertono in vendite affiliate (top list, guide, comparison).
          </p>
          <div className="mt-3 max-h-[420px] overflow-auto pr-1 divide-y divide-white/10">
            {pillarArticles.map((it) => (
              <CheckRow key={it.id} it={it} />
            ))}
          </div>
        </div>
      </section>

      <section className="mp-card p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-black">Prompt pronto per il primo articolo</h3>
            <p className="text-sm text-slate-300 mt-2">
              Copia/incolla in ChatGPT e poi fai editing. Obiettivo: tabella comparativa + FAQ + CTA.
            </p>
          </div>
          <button
            className="mp-btn-primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(promptDraft);
                alert('Prompt copiato negli appunti ✅');
              } catch {
                alert('Impossibile copiare. Seleziona e copia manualmente.');
              }
            }}
          >
            Copia prompt
          </button>
        </div>
        <pre className="mt-4 text-xs md:text-sm whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-4 text-slate-200">
          {promptDraft}
        </pre>
      </section>
    </div>
  );
}
