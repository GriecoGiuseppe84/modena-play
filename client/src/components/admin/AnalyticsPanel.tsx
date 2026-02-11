import React, { useMemo, useState } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';

function toISO(d: Date) {
  return d.toISOString();
}

export default function AnalyticsPanel() {
  const [from, setFrom] = useState(() => toISO(new Date(Date.now() - 7 * 24 * 3600 * 1000)));
  const [to, setTo] = useState(() => toISO(new Date()));

  const q = useAnalytics(from, to);
  const summary = q.data;

  const csv = useMemo(() => {
    const rows: string[][] = [
      ['metric', 'value'],
      ['clicks', String(summary?.clicks ?? 0)],
      ['revenue', String(summary?.revenue ?? 0)],
      ['conversionRate', String(summary?.conversionRate ?? 0)],
      ['totalLinks', String(summary?.totalLinks ?? 0)],
      ['activeLinks', String(summary?.activeLinks ?? 0)],
      ['totalClicks', String(summary?.totalClicks ?? 0)],
    ];
    return rows.map((r) => r.join(',')).join('\n');
  }, [summary]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <h2 className="text-xl font-black">Analytics</h2>
      <div className="mt-4 grid md:grid-cols-3 gap-3">
        <label className="block">
          <div className="text-sm font-semibold text-slate-300">From (ISO)</div>
          <input className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="block">
          <div className="text-sm font-semibold text-slate-300">To (ISO)</div>
          <input className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <div className="flex items-end">
          <button onClick={() => q.refetch()} className="w-full px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black">
            Reload
          </button>
        </div>
      </div>

      <div className="mt-5 grid md:grid-cols-4 gap-3">
        <Card title="Clicks (range)" value={summary?.clicks ?? 0} />
        <Card title="Revenue (range)" value={summary?.revenue ?? 0} suffix="€" />
        <Card title="Links attivi" value={summary?.activeLinks ?? 0} />
        <Card title="Clicks (lifetime)" value={summary?.totalClicks ?? 0} />
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="font-black">Top Links</div>
          <div className="mt-3 grid gap-2">
            {(summary?.topLinks ?? []).map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <div className="text-slate-300 truncate">{l.title} <span className="text-slate-500">/{l.slug}</span></div>
                <div className="text-slate-200 font-black">{l.clicks}</div>
              </div>
            ))}
            {(!summary?.topLinks || summary.topLinks.length === 0) ? <div className="text-slate-500 text-sm">Nessun dato.</div> : null}
          </div>
        </div>

        
<div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="font-black">Top Pagine (click + views + CTR)</div>
          <div className="mt-3 grid gap-2">
            {(summary?.topPages ?? []).map((p: any, idx: number) => (
              <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center text-sm">
                <div className="text-slate-300 truncate">{p.page}</div>
                <div className="text-slate-200 font-black text-right">{p.clicks}</div>
                <div className="text-slate-200 font-black text-right">{p.views ?? 0}</div>
                <div className="text-modena-cyan font-black text-right">{p.ctr ?? 0}%</div>
              </div>
            ))}
            {(!summary?.topPages || summary.topPages.length === 0) ? (
              <div className="text-slate-500 text-sm">Nessun dato (serve traffico e tracking pageviews).</div>
            ) : null}
          </div>
          <div className="mt-2 text-xs text-slate-500 grid grid-cols-[1fr_auto_auto_auto] gap-3">
            <div />
            <div className="text-right">click</div>
            <div className="text-right">views</div>
            <div className="text-right">CTR</div>
          </div>
        </div></div>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-sm font-semibold text-slate-300">Export CSV</div>
        <textarea className="mt-2 w-full h-40 rounded-xl bg-slate-950 border border-slate-700 p-3 font-mono text-xs" value={csv} readOnly />
      </div>
    </div>
  );
}

function Card({ title, value, suffix }: { title: string; value: any; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
      <div className="text-sm text-slate-400">{title}</div>
      <div className="text-2xl font-black mt-1">
        {value}{suffix ? <span className="text-slate-400 text-lg font-bold ml-1">{suffix}</span> : null}
      </div>
    </div>
  );
}
