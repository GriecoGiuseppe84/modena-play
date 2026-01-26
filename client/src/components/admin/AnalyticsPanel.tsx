import React, { useMemo, useState } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { api } from '../../services/api';

function toISO(d: Date) {
  return d.toISOString();
}

export default function AnalyticsPanel() {
  const [from, setFrom] = useState(() => toISO(new Date(Date.now() - 7 * 24 * 3600 * 1000)));
  const [to, setTo] = useState(() => toISO(new Date()));

  const q = useAnalytics(from, to);

  const summary = q.data;

  const csv = useMemo(() => {
    const rows = [
      ['metric', 'value'],
      ['clicks', String(summary?.clicks ?? 0)],
      ['conversions', String(summary?.conversions ?? 0)],
      ['revenue', String(summary?.revenue ?? 0)],
      ['commission', String(summary?.commission ?? 0)],
      ['conversionRate', String(summary?.conversionRate ?? 0)],
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
        <Card title="Clicks" value={summary?.clicks ?? 0} />
        <Card title="Conversions" value={summary?.conversions ?? 0} />
        <Card title="Revenue" value={summary?.revenue ?? 0} suffix="€" />
        <Card title="Conv %" value={summary?.conversionRate ?? 0} suffix="%" />
      </div>

      <div className="mt-6">
        <div className="text-sm font-semibold text-slate-300">Export CSV</div>
        <textarea className="mt-2 w-full h-40 rounded-xl bg-slate-950 border border-slate-700 p-3 font-mono text-xs" value={csv} readOnly />
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Nota: chart vero lo aggiungiamo nella V1.1 (qui MVP = pannello numerico + export).
      </div>
    </div>
  );
}

function Card({ title, value, suffix }: { title: string; value: any; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
      <div className="text-xs text-slate-400">{title}</div>
      <div className="text-xl font-black mt-1">{value}{suffix ? <span className="text-slate-400 text-base font-bold ml-1">{suffix}</span> : null}</div>
    </div>
  );
}
