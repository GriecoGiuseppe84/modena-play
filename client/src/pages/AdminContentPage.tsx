import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

type PostStatus = 'draft' | 'published';

type EditorState = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body_md: string;
  hero_image_url: string;
  seo_title: string;
  seo_description: string;
  status: PostStatus;
  published_at: string;
  category_id: string;
  tags: string;
};

const emptyEditor = (): EditorState => ({
  title: '',
  slug: '',
  excerpt: '',
  body_md: '',
  hero_image_url: '',
  seo_title: '',
  seo_description: '',
  status: 'draft',
  published_at: '',
  category_id: '',
  tags: '',
});

function toTagSlugs(tags: string) {
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export default function AdminContentPage() {
  const { email, logout } = useAuth();

  const [editor, setEditor] = useState<EditorState>(emptyEditor());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');

  const postsQ = useQuery({
    queryKey: ['admin-posts'],
    queryFn: async () => {
      const { data } = await api.get('/api/content/admin/posts');
      return (data.items ?? []) as any[];
    },
  });

  const categoriesQ = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await api.get('/api/content/admin/categories');
      return (data.items ?? []) as any[];
    },
  });

  const selectedId = editor.id;
  const selectedPost = useMemo(() => (postsQ.data ?? []).find((p: any) => p.id === selectedId), [postsQ.data, selectedId]);

  useEffect(() => {
    setMsg(null);
  }, [selectedId]);

  const startNew = () => setEditor(emptyEditor());

  const loadPost = async (id: string) => {
    // We only have list data here; body is not included. Fetch by slug (public) won't return draft.
    // So we call admin read-by-id endpoint if present; else fall back to list (limited fields).
    try {
      const { data } = await api.get(`/api/content/admin/posts/${id}`);
      const p = data.item;
      setEditor({
        id: p.id,
        title: p.title || '',
        slug: p.slug || '',
        excerpt: p.excerpt || '',
        body_md: p.body_md || '',
        hero_image_url: p.hero_image_url || '',
        seo_title: p.seo_title || '',
        seo_description: p.seo_description || '',
        status: (p.status || 'draft') as PostStatus,
        published_at: p.published_at ? String(p.published_at).slice(0, 16) : '',
        category_id: p.category_id || '',
        tags: Array.isArray(data.tags) ? data.tags.map((t: any) => t.slug).join(', ') : '',
      });
    } catch {
      const p = (postsQ.data ?? []).find((x: any) => x.id === id);
      if (!p) return;
      setEditor((s) => ({
        ...s,
        id: p.id,
        title: p.title || '',
        slug: p.slug || '',
        excerpt: p.excerpt || '',
        status: (p.status || 'draft') as PostStatus,
        published_at: p.published_at ? String(p.published_at).slice(0, 16) : '',
      }));
      setMsg('Nota: corpo articolo non caricato. Salva per aggiornare i campi disponibili.');
    }
  };

  const save = async () => {
    setMsg(null);
    setSaving(true);
    try {
      const payload = {
        title: editor.title.trim(),
        slug: editor.slug.trim() || null,
        excerpt: editor.excerpt.trim() || null,
        body_md: editor.body_md || null,
        hero_image_url: editor.hero_image_url.trim() || null,
        seo_title: editor.seo_title.trim() || null,
        seo_description: editor.seo_description.trim() || null,
        status: editor.status,
        published_at: editor.published_at ? new Date(editor.published_at).toISOString() : null,
        category_id: editor.category_id || null,
        tag_slugs: toTagSlugs(editor.tags),
      };

      if (editor.id) {
        await api.put(`/api/content/admin/posts/${editor.id}`, payload);
        setMsg('Salvato ✅');
      } else {
        const { data } = await api.post('/api/content/admin/posts', payload);
        setMsg('Creato ✅');
        if (data?.item?.id) {
          setEditor((s) => ({ ...s, id: data.item.id, slug: data.item.slug || s.slug }));
        }
      }

      await postsQ.refetch();
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.post('/api/content/admin/categories', { name });
      setNewCategory('');
      await categoriesQ.refetch();
      setMsg('Categoria creata ✅');
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute role="admin" redirectTo="/admin/login">
      <AppShell
        title="Content"
        subtitle="Crea e pubblica guide in stile magazine. (Focus: gaming safe — niente casino/slot/bonus)"
        right={
          <>
            <Link className="mp-btn-secondary" to="/">Home</Link>
            <Link className="mp-btn-secondary" to="/admin/diagnostics">Diagnostica DB</Link>
            <Link className="mp-btn-secondary" to="/admin/affiliate-links">Affiliate Links</Link>
            <Link className="mp-btn-secondary" to="/admin/content">Content</Link>
            <button
              onClick={() => {
                logout();
                window.location.href = '/admin/login';
              }}
              className="mp-btn-danger"
            >
              Logout
            </button>
          </>
        }
      >
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[360px_1fr] gap-6 items-start">
          <div className="mp-card p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm text-slate-400">Admin</div>
                <div className="font-black">{email ?? '—'}</div>
              </div>
              <button className="mp-btn-primary" onClick={startNew}>Nuovo</button>
            </div>

            <div className="mt-4">
              <div className="text-xs text-slate-400">Articoli</div>
              <div className="mt-2 space-y-2 max-h-[60vh] overflow-auto pr-1">
                {postsQ.isLoading && <div className="text-slate-300 text-sm">Caricamento…</div>}
                {postsQ.error && <div className="text-red-200 text-sm">Errore: {String((postsQ.error as any)?.message || postsQ.error)}</div>}
                {(postsQ.data ?? []).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => loadPost(p.id)}
                    className={
                      'w-full text-left rounded-xl border px-3 py-3 ' +
                      (editor.id === p.id
                        ? 'border-modena-cyan/40 bg-modena-cyan/10'
                        : 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/70')
                    }
                  >
                    <div className="font-semibold leading-tight">{p.title}</div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <span className={
                        'mp-badge ' +
                        (p.status === 'published'
                          ? 'text-modena-gold border-modena-gold/30 bg-modena-gold/10'
                          : 'border-slate-700 bg-slate-900/40')
                      }>
                        {p.status}
                      </span>
                      <span>/blog/{p.slug}</span>
                    </div>
                  </button>
                ))}
                {(postsQ.data ?? []).length === 0 && !postsQ.isLoading && (
                  <div className="text-slate-400 text-sm">Nessun articolo ancora. Clicca “Nuovo”.</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {msg && (
              <div className="mp-card p-4 border border-slate-800 bg-slate-950/40 text-slate-200 text-sm">
                {msg}
              </div>
            )}

            <div className="mp-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-400">Editor</div>
                  <div className="text-xl font-black">{editor.id ? 'Modifica articolo' : 'Nuovo articolo'}</div>
                </div>
                <div className="flex gap-2">
                  {editor.slug && editor.status === 'published' && (
                    <a className="mp-btn-secondary" href={`/blog/${editor.slug}`} target="_blank" rel="noreferrer">
                      Apri
                    </a>
                  )}
                  <button className="mp-btn-primary" onClick={save} disabled={saving}>
                    {saving ? '…' : 'Salva'}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Titolo</label>
                  <input className="mp-input" value={editor.title} onChange={(e) => setEditor((s) => ({ ...s, title: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Slug (opzionale)</label>
                  <input className="mp-input" value={editor.slug} onChange={(e) => setEditor((s) => ({ ...s, slug: e.target.value }))} placeholder="es: migliori-controller-ps5" />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs text-slate-400 mb-1">Excerpt</label>
                <textarea className="mp-input min-h-[90px]" value={editor.excerpt} onChange={(e) => setEditor((s) => ({ ...s, excerpt: e.target.value }))} />
              </div>

              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hero image URL (opzionale)</label>
                  <input className="mp-input" value={editor.hero_image_url} onChange={(e) => setEditor((s) => ({ ...s, hero_image_url: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Categoria</label>
                  <select className="mp-input" value={editor.category_id} onChange={(e) => setEditor((s) => ({ ...s, category_id: e.target.value }))}>
                    <option value="">(nessuna)</option>
                    {(categoriesQ.data ?? []).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Stato</label>
                  <select className="mp-input" value={editor.status} onChange={(e) => setEditor((s) => ({ ...s, status: e.target.value as PostStatus }))}>
                    <option value="draft">draft</option>
                    <option value="published">published</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Published at (opzionale)</label>
                  <input
                    type="datetime-local"
                    className="mp-input"
                    value={editor.published_at}
                    onChange={(e) => setEditor((s) => ({ ...s, published_at: e.target.value }))}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs text-slate-400 mb-1">Tag (slug), separati da virgola</label>
                <input className="mp-input" value={editor.tags} onChange={(e) => setEditor((s) => ({ ...s, tags: e.target.value }))} placeholder="steam-deck, ps5, controller" />
              </div>

              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SEO title (opzionale)</label>
                  <input className="mp-input" value={editor.seo_title} onChange={(e) => setEditor((s) => ({ ...s, seo_title: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SEO description (opzionale)</label>
                  <input className="mp-input" value={editor.seo_description} onChange={(e) => setEditor((s) => ({ ...s, seo_description: e.target.value }))} />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs text-slate-400 mb-1">Body (Markdown)</label>
                <textarea
                  className="mp-input min-h-[360px] font-mono text-sm"
                  value={editor.body_md}
                  onChange={(e) => setEditor((s) => ({ ...s, body_md: e.target.value }))}
                  placeholder="Scrivi in Markdown…"
                />
                <div className="mt-2 text-xs text-slate-500">
                  Tip: mantieni il focus su offerte, hardware, guide e servizi per gamer. Evita parole chiave tipo casino/slot/bonus.
                </div>
              </div>
            </div>

            <div className="mp-card p-6">
              <div className="font-black">Categorie</div>
              <div className="mt-3 flex flex-col md:flex-row gap-2">
                <input
                  className="mp-input"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Nuova categoria (es. Hardware)"
                />
                <button className="mp-btn-secondary" onClick={addCategory} disabled={saving}>Aggiungi</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(categoriesQ.data ?? []).map((c: any) => (
                  <span key={c.id} className="mp-badge border-slate-700 bg-slate-900/40">{c.name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
