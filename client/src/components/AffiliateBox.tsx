import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

type Props = {
  slug: string;
  pagePath?: string;
  titleOverride?: string;
  subtitle?: string;
  utm?: Partial<Record<'utm_source'|'utm_medium'|'utm_campaign'|'utm_content'|'utm_term', string>>;
};

function buildResolveUrl(slug: string, pagePath?: string, utm?: Props['utm']) {
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

export default function AffiliateBox({ slug, pagePath, titleOverride, subtitle, utm }: Props) {
  const q = useQuery({
    queryKey: ['public-link', slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/affiliate/public/links/${slug}`);
      return data.item as any;
    },
    enabled: Boolean(slug),
  });

  if (q.isLoading) return <div className="mp-card p-4">Caricamento offerta…</div>;
  if (q.error) return (
    <div className="mp-card p-4 border border-red-500/30">
      <div className="font-bold text-red-200">Offerta non disponibile</div>
      <div className="text-slate-300 text-sm mt-1">{String((q.error as any).message || q.error)}</div>
    </div>
  );

  const item = q.data;
  const brand = item?.brand_name ? String(item.brand_name) : 'Partner';
  const title = titleOverride || item?.title || 'Offerta consigliata';
  const go = buildResolveUrl(slug, pagePath || window.location.pathname, utm);

  const payout = item?.payout_type
    ? `${item.payout_type}${item.payout_value ? ` • ${item.payout_value}` : ''}`
    : null;

  return (
    <div className="mp-card p-5 border border-slate-800 bg-slate-950/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">{brand}</div>
          <div className="font-black text-lg mt-1">{title}</div>
          {subtitle && <div className="text-slate-300 text-sm mt-2">{subtitle}</div>}
          {payout && <div className="text-slate-400 text-xs mt-2">Payout: {payout}</div>}
          {Array.isArray(item?.tags) && item.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.tags.slice(0, 6).map((t: string) => (
                <span key={t} className="mp-badge border-slate-700 bg-slate-900/40">{t}</span>
              ))}
            </div>
          )}
        </div>

        <a className="mp-btn-primary whitespace-nowrap" href={go}>
          Vai all’offerta
        </a>
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Link tracciato (UTM + pagina di provenienza) per migliorare le guide e le offerte consigliate.
      </div>
    </div>
  );
}
