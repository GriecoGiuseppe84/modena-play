import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppShell from '../components/AppShell';
import AffiliateBox from '../components/AffiliateBox';
import { api } from '../services/api';
import { usePageView } from '../hooks/usePageView';

function mdLite(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let html = esc(md || '');
  // headings
  html = html.replace(/^###\s(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s(.+)$/gm, '<h1>$1</h1>');
  // bold/italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // links
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  // paragraphs
  html = html
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.match(/^<h\d|^<ul|^<ol|^<blockquote/) ? p : `<p>${p.replace(/\n/g, '<br/>')}</p>`))
    .join('\n');
  return html;
}

export default function BlogPost() {
  const { slug = '' } = useParams();
  usePageView(`Blog • ${slug}`);

  const q = useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/content/posts/${slug}`);
      return data as any;
    },
    enabled: Boolean(slug),
  });

  const item = q.data?.item;
  const tags = q.data?.tags ?? [];
  const related = q.data?.related ?? [];

  const readingTime = useMemo(() => {
    const words = String(item?.body_md ?? '').split(/\s+/).filter(Boolean).length;
    const min = Math.max(1, Math.round(words / 220));
    return `${min} min lettura`;
  }, [item?.body_md]);

  return (
    <AppShell
      title={item?.title || 'Articolo'}
      subtitle={item?.excerpt || 'Guide pratiche e dritte per scegliere bene nel mondo gaming.'}
      right={
        <>
          <Link className="mp-btn-secondary" to="/blog">Blog</Link>
          <Link className="mp-btn-secondary" to="/login">Accedi</Link>
          <Link className="mp-btn-primary" to="/signup">Crea account</Link>
        </>
      }
    >
      {q.isLoading && <div className="mp-card p-6">Caricamento…</div>}

      {q.error && (
        <div className="mp-card p-6 border border-red-500/30">
          <div className="font-black text-red-200">Impossibile caricare l’articolo</div>
          <div className="text-slate-300 mt-1 text-sm">{String((q.error as any)?.message || q.error)}</div>
        </div>
      )}

      {item && (
        <article className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="mp-card p-6 md:p-7">
            {item.hero_image_url && (
              <img src={item.hero_image_url} alt={item.title} className="w-full rounded-2xl mb-5 border border-slate-800" />
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              {item.category_name && (
                <span className="mp-badge border-slate-700 bg-slate-900/40">{item.category_name}</span>
              )}
              <span>•</span>
              <span>{readingTime}</span>
              {item.published_at && (
                <>
                  <span>•</span>
                  <span>{new Date(item.published_at).toLocaleDateString('it-IT')}</span>
                </>
              )}
            </div>

            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((t: any) => (
                  <span key={t.id} className="mp-badge text-modena-cyan border-modena-cyan/30 bg-modena-cyan/10">
                    #{t.slug}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 space-y-5">
              {String(item.body_md || '')
                .split(/\[affiliate:([a-z0-9-]+)\]/i)
                .map((chunk, idx, arr) => {
                  // odd indices are captured slugs
                  if (idx % 2 === 1) {
                    const sl = String(chunk || '').trim().toLowerCase();
                    if (!sl) return null;
                    return (
                      <AffiliateBox
                        key={`aff-${idx}-${sl}`}
                        slug={sl}
                        subtitle="Consigliata dentro questa guida: apri l’offerta in una nuova scheda e torna qui quando vuoi."
                        utm={{ utm_source: 'modenaplay', utm_medium: 'content', utm_campaign: String(item.slug || '') }}
                      />
                    );
                  }
                  if (!chunk) return null;
                  return (
                    <div
                      key={`md-${idx}`}
                      className="prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: mdLite(String(chunk)) }}
                    />
                  );
                })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="mp-card p-5">
              <div className="font-black text-lg">Vuoi offerte e guide “solo roba buona”?</div>
              <p className="text-slate-300 mt-2 text-sm">
                Registrandoti puoi salvare i preferiti e ricevere una mail settimanale con le guide e le offerte più utili.
              </p>
              <div className="mt-4 flex gap-2">
                <Link className="mp-btn-primary" to="/signup">Crea account</Link>
                <Link className="mp-btn-secondary" to="/login">Accedi</Link>
              </div>
            </div>

            <div className="mp-card p-5">
              <div className="font-black text-lg">Correlati</div>
              <div className="mt-3 space-y-3">
                {related.length === 0 && <div className="text-slate-400 text-sm">Nessun correlato per ora.</div>}
                {related.map((p: any) => (
                  <Link key={p.id} to={`/blog/${p.slug}`} className="block rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-950/70">
                    <div className="font-semibold">{p.title}</div>
                    {p.excerpt && <div className="text-slate-400 text-sm mt-1 line-clamp-2">{p.excerpt}</div>}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </article>
      )}
    </AppShell>
  );
}
