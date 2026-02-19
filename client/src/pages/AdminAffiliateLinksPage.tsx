import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AppShell from '../components/AppShell';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

type AffiliateLink = {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  source_url: string;
  destination_url: string;
  destination_base_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  network: string;
  slug: string;
  is_active: boolean;
  click_count: number;
  created_at: string;
  updated_at: string;
};

type Summary = {
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
  last7DaysClicks: number;
  topLinks: Array<{ id: string; title: string; slug: string; click_count: number }>;
};

function clampText(v: string, max = 56) {
  const s = String(v || '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function normalizeTags(v: string) {
  return Array.from(
    new Set(
      String(v || '')
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
        .map((x) => x.slice(0, 32)),
    ),
  ).slice(0, 12);
}

function buildPreviewUrl(baseUrl: string, utm: Record<string, string>) {
  try {
    const u = new URL(baseUrl);
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
    for (const k of keys) {
      const v = String(utm[k] || '').trim();
      if (v) u.searchParams.set(k, v);
      else u.searchParams.delete(k);
    }
    return u.toString();
  } catch {
    return '';
  }
}

type LinkForm = {
  title: string;
  description: string;
  category: string;
  tagsCsv: string;
  destination_base_url: string;
  source_url: string;
  network: string;
  slug: string;
  is_active: boolean;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
};

const emptyForm: LinkForm = {
  title: '',
  description: '',
  category: '',
  tagsCsv: '',
  destination_base_url: '',
  source_url: '',
  network: 'generic',
  slug: '',
  is_active: true,
  utm_source: 'modenaplay',
  utm_medium: 'affiliate',
  utm_campaign: '',
  utm_content: '',
  utm_term: '',
};

export default function AdminAffiliateLinksPage() {
  const { logout } = useAuth();

  const [items, setItems] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [daily, setDaily] = useState<Array<{ day: string; clicks: number }>>([]);

  // Filters
  const [q, setQ] = useState('');
  const [active, setActive] = useState<'all' | '1' | '0'>('all');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [network, setNetwork] = useState('');
  const [sort, setSort] = useState<'new' | 'top'>('new');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AffiliateLink | null>(null);
  const [form, setForm] = useState<LinkForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const origin = useMemo(() => {
    try {
      return window.location.origin;
    } catch {
      return '';
    }
  }, []);

  const categoryOptions = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      const c = String(it.category || '').trim();
      if (!c) continue;
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count }));
  }, [items]);

  const tagOptions = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      for (const t of it.tags ?? []) {
        const tt = String(t || '').trim().toLowerCase();
        if (!tt) continue;
        m.set(tt, (m.get(tt) ?? 0) + 1);
      }
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 18)
      .map(([key, count]) => ({ key, count }));
  }, [items]);

  async function loadAll() {
    setLoading(true);
    try {
      setError(null);
      const params: any = { limit: 500, sort };
      if (q.trim()) params.q = q.trim();
      if (active !== 'all') params.active = active;
      if (category) params.category = category;
      if (network) params.network = network;
      if (tag) params.tag = tag;

      const [rLinks, rSum, rDaily] = await Promise.all([
        api.get('/api/affiliate/links', { params }),
        api.get('/api/affiliate/analytics/summary'),
        api.get('/api/affiliate/analytics/daily', { params: { days: 14 } }),
      ]);

      setItems(rLinks.data?.items ?? []);
      setSummary(rSum.data ?? null);
      setDaily(rDaily.data?.items ?? []);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Errore caricamento';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadAll(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, active, category, tag, network, sort]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(it: AffiliateLink) {
    setEditing(it);
    setForm({
      title: it.title || '',
      description: it.description || '',
      category: it.category || '',
      tagsCsv: (it.tags ?? []).join(','),
      destination_base_url: it.destination_base_url || it.destination_url || '',
      source_url: it.source_url || '',
      network: it.network || 'generic',
      slug: it.slug || '',
      is_active: Boolean(it.is_active),
      utm_source: it.utm_source || 'modenaplay',
      utm_medium: it.utm_medium || 'affiliate',
      utm_campaign: it.utm_campaign || '',
      utm_content: it.utm_content || '',
      utm_term: it.utm_term || '',
    });
    setShowModal(true);
  }

  async function onSubmit() {
    setSaving(true);
    try {
      setError(null);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        tags: normalizeTags(form.tagsCsv),
        destination_base_url: form.destination_base_url.trim(),
        source_url: form.source_url.trim(),
        network: form.network,
        slug: form.slug.trim(),
        is_active: form.is_active,
        utm_source: form.utm_source.trim(),
        utm_medium: form.utm_medium.trim(),
        utm_campaign: form.utm_campaign.trim(),
        utm_content: form.utm_content.trim(),
        utm_term: form.utm_term.trim(),
      };

      if (!payload.title || !payload.destination_base_url) {
        setError('Titolo e URL base sono obbligatori.');
        return;
      }

      if (editing) {
        await api.patch(`/api/affiliate/links/${encodeURIComponent(editing.id)}`, payload);
      } else {
        await api.post('/api/affiliate/links', payload);
      }

      setShowModal(false);
      await loadAll();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Errore salvataggio';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function copyShortLink(it: AffiliateLink) {
    try {
      const url = `${origin}/r/${it.slug}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(it.id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      setError('Impossibile copiare negli appunti');
    }
  }

  const previewUrl = useMemo(() => {
    return buildPreviewUrl(form.destination_base_url.trim(), {
      utm_source: form.utm_source,
      utm_medium: form.utm_medium,
      utm_campaign: form.utm_campaign,
      utm_content: form.utm_content,
      utm_term: form.utm_term,
    });
  }, [form.destination_base_url, form.utm_source, form.utm_medium, form.utm_campaign, form.utm_content, form.utm_term]);

  return (
    <ProtectedRoute role="admin">
      <AppShell
        title="Affiliate Links"
        subtitle="Crea short-link tracciati, aggiungi categorie/tags e costruisci URL con UTM automaticamente."
        right={
          <div className="flex gap-2 items-center">
            <Link className="mp-btn-secondary" to="/admin/dashboard">Control Room</Link>
            <Link className="mp-btn-secondary" to="/admin/content">Content</Link>
            <Link className="mp-btn-secondary" to="/admin/diagnostics">Diagnostica DB</Link>
            <Link className="mp-btn-secondary" to="/risorse">Risorse</Link>
            <button className="mp-btn-danger" onClick={logout}>Logout</button>
          </div>
        }
      >
        {/* top stats */}
        <section className="grid md:grid-cols-4 gap-4">
          <div className="mp-card p-4">
            <div className="text-xs text-slate-400">Link totali</div>
            <div className="text-2xl font-bold mt-1">{summary?.totalLinks ?? '—'}</div>
          </div>
          <div className="mp-card p-4">
            <div className="text-xs text-slate-400">Attivi</div>
            <div className="text-2xl font-bold mt-1">{summary?.activeLinks ?? '—'}</div>
          </div>
          <div className="mp-card p-4">
            <div className="text-xs text-slate-400">Click totali</div>
            <div className="text-2xl font-bold mt-1">{summary?.totalClicks ?? '—'}</div>
          </div>
          <div className="mp-card p-4">
            <div className="text-xs text-slate-400">Ultimi 7 giorni</div>
            <div className="text-2xl font-bold mt-1">{summary?.last7DaysClicks ?? '—'}</div>
          </div>
        </section>

        {/* controls */}
        <section className="mt-6 mp-card p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <div className="flex-1 w-full grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input className="mp-input" placeholder="Cerca titolo, slug, descrizione…" value={q} onChange={(e) => setQ(e.target.value)} />

              <select className="mp-input" value={active} onChange={(e) => setActive(e.target.value as any)}>
                <option value="all">Tutti</option>
                <option value="1">Solo attivi</option>
                <option value="0">Solo disattivi</option>
              </select>

              <select className="mp-input" value={sort} onChange={(e) => setSort(e.target.value as any)}>
                <option value="new">Ordina: nuovi</option>
                <option value="top">Ordina: top click</option>
              </select>

              <select className="mp-input" value={network} onChange={(e) => setNetwork(e.target.value)}>
                <option value="">Network: tutti</option>
                <option value="amazon">Amazon</option>
                <option value="ebay">eBay</option>
                <option value="steam">Steam</option>
                <option value="kickstarter">Kickstarter</option>
                <option value="generic">Generic</option>
              </select>

              <select className="mp-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Categoria: tutte</option>
                {categoryOptions.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.key} ({c.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button className="mp-btn-secondary" onClick={() => { setQ(''); setActive('all'); setCategory(''); setNetwork(''); setTag(''); setSort('new'); }}>
                Reset
              </button>
              <button className="mp-btn-primary" onClick={openCreate}>Crea link</button>
            </div>
          </div>

          {/* tags quick filter */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={"mp-badge " + (!tag ? "border-modena-cyan/40" : "")} onClick={() => setTag('')} type="button">
              #tutti
            </button>
            {tagOptions.map((t) => (
              <button
                key={t.key}
                className={"mp-badge " + (tag === t.key ? "border-modena-cyan/40" : "")}
                onClick={() => setTag(t.key)}
                type="button"
                title={`${t.count} link`}
              >
                #{t.key}
              </button>
            ))}
          </div>

          {error && <div className="mt-3 text-sm text-red-300">{error}</div>}
        </section>

        {/* table */}
        <section className="mt-6 mp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="text-left px-4 py-3">Titolo</th>
                  <th className="text-left px-4 py-3">Categoria</th>
                  <th className="text-left px-4 py-3">Network</th>
                  <th className="text-left px-4 py-3">Slug</th>
                  <th className="text-right px-4 py-3">Click</th>
                  <th className="text-left px-4 py-3">Stato</th>
                  <th className="text-right px-4 py-3">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-white/10">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{clampText(it.title, 56)}</div>
                      <div className="text-xs text-slate-400">{clampText(it.description || it.destination_url, 70)}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(it.tags ?? []).slice(0, 3).map((t) => (
                          <span key={t} className="mp-badge">#{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-200">{it.category || '—'}</td>
                    <td className="px-4 py-3 text-slate-200">{it.network}</td>
                    <td className="px-4 py-3">
                      <a className="text-modena-cyan hover:underline" href={`/r/${it.slug}`} target="_blank" rel="noreferrer">
                        /r/{it.slug}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{it.click_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={"mp-badge " + (it.is_active ? "border-modena-cyan/40" : "border-white/10")}>
                        {it.is_active ? 'Attivo' : 'Off'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button className="mp-btn-secondary" onClick={() => copyShortLink(it)}>
                          {copiedId === it.id ? 'Copiato ✓' : 'Copia'}
                        </button>
                        <button className="mp-btn-secondary" onClick={() => openEdit(it)}>
                          Modifica
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && items.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={7}>
                      Nessun link. Clicca “Crea link” per iniziare.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {loading && <div className="px-4 py-3 text-sm text-slate-400">Caricamento…</div>}
        </section>

        {/* lightweight daily chart */}
        <section className="mt-6 mp-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Click giornalieri (ultimi {daily.length || 0} giorni)</h3>
            <span className="text-xs text-slate-400">vista: affiliate_clicks_daily_total</span>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {daily.map((d) => (
              <div key={d.day} className="mp-card-soft p-2">
                <div className="text-[11px] text-slate-400">{String(d.day).slice(5)}</div>
                <div className="text-lg font-bold">{d.clicks}</div>
              </div>
            ))}
            {daily.length === 0 && <div className="text-sm text-slate-400">Nessun dato ancora.</div>}
          </div>
        </section>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
            <div className="relative w-full max-w-2xl mp-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-bold">{editing ? 'Modifica link' : 'Crea nuovo link'}</div>
                  <div className="text-sm text-slate-400">Slug automatico, tracking click e UTM builder.</div>
                </div>
                <button className="mp-btn-secondary" onClick={() => setShowModal(false)}>Chiudi</button>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-5">
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Titolo</label>
                  <input className="mp-input" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="Migliori giochi da tavolo 2026 (Amazon)" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Descrizione (per pagina Risorse)</label>
                  <textarea className="mp-input" rows={3} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="2-3 righe utili: perché lo consigliamo, per chi è, cosa aspettarsi…" />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Categoria</label>
                  <input className="mp-input" value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} placeholder="Giochi da tavolo / RPG / TCG…" />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tag (separati da virgola)</label>
                  <input className="mp-input" value={form.tagsCsv} onChange={(e) => setForm((s) => ({ ...s, tagsCsv: e.target.value }))} placeholder="catan, beginner, 4-players" />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {normalizeTags(form.tagsCsv).map((t) => (
                      <span key={t} className="mp-badge">#{t}</span>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">URL base (senza UTM)</label>
                  <input className="mp-input" value={form.destination_base_url} onChange={(e) => setForm((s) => ({ ...s, destination_base_url: e.target.value }))} placeholder="https://www.amazon.it/..." />
                  {previewUrl && (
                    <div className="mt-2 text-xs text-slate-400">
                      Preview URL finale: <span className="text-slate-200 break-all">{previewUrl}</span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">UTM Builder</div>
                    <span className="text-xs text-slate-400">Consigliato per analytics</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">utm_source</label>
                  <input className="mp-input" value={form.utm_source} onChange={(e) => setForm((s) => ({ ...s, utm_source: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">utm_medium</label>
                  <input className="mp-input" value={form.utm_medium} onChange={(e) => setForm((s) => ({ ...s, utm_medium: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">utm_campaign</label>
                  <input className="mp-input" value={form.utm_campaign} onChange={(e) => setForm((s) => ({ ...s, utm_campaign: e.target.value }))} placeholder="pillar-article-1" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">utm_content</label>
                  <input className="mp-input" value={form.utm_content} onChange={(e) => setForm((s) => ({ ...s, utm_content: e.target.value }))} placeholder="cta-button" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">utm_term</label>
                  <input className="mp-input" value={form.utm_term} onChange={(e) => setForm((s) => ({ ...s, utm_term: e.target.value }))} placeholder="keyword" />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Network</label>
                  <select className="mp-input" value={form.network} onChange={(e) => setForm((s) => ({ ...s, network: e.target.value }))}>
                    <option value="generic">generic</option>
                    <option value="amazon">amazon</option>
                    <option value="ebay">ebay</option>
                    <option value="steam">steam</option>
                    <option value="kickstarter">kickstarter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Slug (opzionale)</label>
                  <input className="mp-input" value={form.slug} onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))} placeholder="catan-amazon" />
                  <div className="text-xs text-slate-400 mt-1">Vuoto = generazione automatica univoca.</div>
                </div>

                <div className="md:col-span-2 flex items-center justify-between pt-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))} />
                    Link attivo
                  </label>
                  <button className="mp-btn-primary" disabled={saving || !form.title.trim() || !form.destination_base_url.trim()} onClick={onSubmit}>
                    {saving ? 'Salvo…' : 'Salva'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
