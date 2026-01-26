import React, { useMemo, useState } from 'react';
import { useAffiliateLinks } from '../../hooks/useAffiliateLinks';
import { useAnalytics } from '../../hooks/useAnalytics';
import LinkManager from './LinkManager';
import AnalyticsPanel from './AnalyticsPanel';

function isoDate(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<'home' | 'links' | 'analytics' | 'settings'>('home');

  const now = new Date();
  const from = useMemo(() => isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), []);
  const to = useMemo(() => new Date().toISOString(), []);

  const links = useAffiliateLinks();
  const analytics = useAnalytics(from, to);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Gestione link affiliati e analytics.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 text-sm text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> server online
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(['home','links','analytics','settings'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 rounded-xl text-sm font-black ${tab === k ? 'bg-slate-800' : 'bg-slate-900/30 border border-slate-800 hover:bg-slate-800/50'}`}>
            {k.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === 'home' && (
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <Card title="Clicks (month)" value={analytics.data?.clicks ?? 0} />
          <Card title="Revenue (month)" value={analytics.data?.revenue ?? 0} suffix="€" />
          <Card title="Conversion %" value={analytics.data?.conversionRate ?? 0} suffix="%" />
          <div className="md:col-span-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
              <div className="text-sm text-slate-400">Links</div>
              <div className="text-2xl font-black mt-1">{links.data?.length ?? 0}</div>
              <div className="text-xs text-slate-500 mt-1">Gestisci i link dal tab LINKS.</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'links' && <div className="mt-6"><LinkManager /></div>}
      {tab === 'analytics' && <div className="mt-6"><AnalyticsPanel /></div>}
      {tab === 'settings' && (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
          <h2 className="text-xl font-black">Settings</h2>
          <p className="text-slate-400 mt-2">Impostazioni piattaforma (gestite dal Setup Wizard + admin_config).</p>
        </div>
      )}
    </div>
  );
}

function Card({ title, value, suffix }: { title: string; value: any; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="text-sm text-slate-400">{title}</div>
      <div className="text-2xl font-black mt-1">{value}{suffix ? <span className="text-slate-400 text-lg font-bold ml-1">{suffix}</span> : null}</div>
    </div>
  );
}
