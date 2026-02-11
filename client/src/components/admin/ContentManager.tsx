import React, { useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  status: 'draft' | 'published';
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

function mdLite(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let html = esc(md || '');
  html = html.replace(/^###\s(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s(.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  html = html
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.match(/^<h\d|^<ul|^<ol|^<blockquote/) ? p : `<p>${p.replace(/\n/g, '<br/>')}</p>`))
    .join('\n');
  return html;
}

export default function ContentManager() {
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [preview, setPreview] = useState(false);

  const posts = useQuery({
    queryKey: ['admin-posts'],
    queryFn: async () => {
      const { data } = await api.get('/api/content/admin/posts');
      return (data.items ?? []) as Post[];
    },
  });

  const links = useQuery({
    queryKey: ['admin-links-mini'],
    queryFn: async () => {
      const { data } = await api.get('/api/affiliate/links');
      return (data.items ?? []) as any[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/content/admin/posts', {
        title,
        excerpt,
        body_md: body,
        status,
        tag_slugs: [],
      });
      return data.item as Post;
    },
    onSuccess: () => {
      setTitle('');
      setExcerpt('');
      setBody('');
      setStatus('draft');
      setPreview(false);
      qc.invalidateQueries({ queryKey: ['admin-posts'] });
    },
  });

  const bodyPreview = useMemo(() => mdLite(body), [body]);

  function insertAtCursor(text: string) {
    const el = document.getElementById('mp-body') as HTMLTextAreaElement | null;
    if (!el) return setBody((b) => b + text);
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + text + el.value.slice(end);
    setBody(next);
    setTimeout(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  return (
    <div className="space-y-5">
      <div className="mp-card p-5">
        <div className="font-black text-lg">Nuovo contenuto</div>
        <p className="text-slate-400 text-sm mt-1">
          Scrivi in Markdown. Per mostrare una box “Offerta consigliata” dentro l’articolo, inserisci:
          <span className="ml-2 mp-badge border-slate-700 bg-slate-900/40">[affiliate:slug]</span>
        </p>

        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <input className="mp-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo" />
          <select className="mp-input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="draft">Bozza</option>
            <option value="published">Pubblicato</option>
          </select>
        </div>

        <input
          className="mp-input mt-3"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Excerpt (1–2 righe che vendono l’utilità)"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="mp-btn-secondary" onClick={() => insertAtCursor('\n## Sezione\n')}>
            + Heading
          </button>
          <button type="button" className="mp-btn-secondary" onClick={() => insertAtCursor('\n- Punto 1\n- Punto 2\n')}>
            + Lista
          </button>
          <button type="button" className="mp-btn-secondary" onClick={() => insertAtCursor('\n**Pro tip:** ')}>+ Pro tip</button>
          <button type="button" className="mp-btn-secondary" onClick={() => setPreview((v) => !v)}>
            {preview ? 'Modifica' : 'Preview'}
          </button>
        </div>

        <div className="mt-4 grid lg:grid-cols-[1fr_320px] gap-4 items-start">
          <div>
            {!preview ? (
              <textarea
                id="mp-body"
                className="mp-input h-72"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Scrivi qui… (Markdown)"
              />
            ) : (
              <div className="mp-card p-4 border border-slate-800 bg-slate-950/30">
                <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: bodyPreview }} />
                <div className="text-xs text-slate-500 mt-3">
                  Nota: le box affiliate si vedono nella pagina pubblica dell’articolo quando inserisci [affiliate:slug].
                </div>
              </div>
            )}
          </div>

          <div className="mp-card p-4 border border-slate-800 bg-slate-950/30">
            <div className="font-black">Inserisci box offerta</div>
            <p className="text-slate-400 text-sm mt-1">
              Seleziona un link e inseriamo automaticamente lo shortcode nell’articolo.
            </p>

            {links.isLoading && <div className="text-slate-300 text-sm mt-3">Caricamento link…</div>}
            {links.error && (
              <div className="text-red-200 text-sm mt-3">Errore nel caricamento link: {String((links.error as any).message || links.error)}</div>
            )}

            <div className="mt-3 space-y-2 max-h-64 overflow-auto">
              {(links.data ?? []).slice(0, 50).map((l: any) => (
                <button
                  key={l.id}
                  type="button"
                  className="w-full text-left rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-950/70"
                  onClick={() => insertAtCursor(`\n[affiliate:${String(l.slug || '').toLowerCase()}]\n`)}
                >
                  <div className="font-semibold">{l.title}</div>
                  <div className="text-slate-400 text-xs mt-1">slug: {l.slug}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button className="mp-btn-primary" disabled={!title || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Salvataggio…' : 'Crea contenuto'}
          </button>
          {create.error && (
            <span className="text-red-200 text-sm">{String((create.error as any).message || create.error)}</span>
          )}
        </div>
      </div>

      <div className="mp-card p-5">
        <div className="font-black text-lg">Contenuti</div>
        <p className="text-slate-400 text-sm mt-1">Bozze e pubblicati. Usa le guide per portare traffico e click affiliati.</p>

        {posts.isLoading && <div className="text-slate-300 mt-4">Caricamento…</div>}
        {posts.error && (
          <div className="text-red-200 mt-4">Errore: {String((posts.error as any).message || posts.error)}</div>
        )}

        <div className="mt-4 space-y-2">
          {(posts.data ?? []).map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-slate-400 text-xs mt-1">
                    /blog/{p.slug} • {p.status} • {p.published_at ? new Date(p.published_at).toLocaleDateString('it-IT') : '—'}
                  </div>
                </div>
                <a className="mp-btn-secondary" href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">
                  Apri
                </a>
              </div>
              {p.excerpt && <div className="text-slate-300 text-sm mt-2 line-clamp-2">{p.excerpt}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
