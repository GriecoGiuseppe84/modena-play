import React, { useMemo, useState } from 'react';
import { useAffiliateLinks } from '../../hooks/useAffiliateLinks';
import type { AffiliateLinkStatus } from '../../types';

export default function LinkManager() {
  const { data, isLoading, create, update } = useAffiliateLinks();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [source_url, setSourceUrl] = useState('');
  const [destination_url, setDestUrl] = useState('');
  const [category, setCategory] = useState('general');
  const [commission_rate, setCommission] = useState(0.05);
  const [status, setStatus] = useState<AffiliateLinkStatus>('active');

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Links</h2>
        <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black">
          + New Link
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-slate-200">
            <tr>
              <th className="text-left p-3">Title</th>
              <th className="text-right p-3">Clicks</th>
              <th className="text-right p-3">Conv</th>
              <th className="text-right p-3">Commission</th>
              <th className="text-right p-3">Status</th>
            </tr>
          </thead>
          <tbody className="bg-slate-950/30">
            {isLoading ? (
              <tr><td className="p-4 text-slate-400" colSpan={5}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-4 text-slate-400" colSpan={5}>Nessun link.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="p-3">
                  <div className="font-bold">{r.title}</div>
                  <div className="text-xs text-slate-400 truncate max-w-[520px]">/api/affiliate/r/{r.id}</div>
                </td>
                <td className="p-3 text-right font-mono">{r.click_count}</td>
                <td className="p-3 text-right font-mono">{r.conversion_count}</td>
                <td className="p-3 text-right font-mono">{Math.round(r.commission_rate * 100)}%</td>
                <td className="p-3 text-right">
                  <select
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1"
                    value={r.status}
                    onChange={(e) => update.mutate({ id: r.id, patch: { status: e.target.value as any } })}
                  >
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="archived">archived</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-center justify-between">
              <div className="text-lg font-black">Create Link</div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="mt-4 grid gap-3">
              <Field label="Title" value={title} onChange={setTitle} />
              <Field label="Source URL" value={source_url} onChange={setSourceUrl} />
              <Field label="Destination URL" value={destination_url} onChange={setDestUrl} />
              <Field label="Category" value={category} onChange={setCategory} />
              <label className="block">
                <div className="text-sm font-semibold text-slate-300">Commission Rate (0..1)</div>
                <input type="number" step="0.01" className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2" value={commission_rate} onChange={(e) => setCommission(Number(e.target.value))} />
              </label>
              <label className="block">
                <div className="text-sm font-semibold text-slate-300">Status</div>
                <select className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="archived">archived</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-800/60 font-bold">Cancel</button>
              <button
                onClick={async () => {
                  await create.mutateAsync({ title, source_url, destination_url, category, commission_rate, status });
                  setOpen(false);
                  setTitle(''); setSourceUrl(''); setDestUrl(''); setCategory('general'); setCommission(0.05); setStatus('active');
                }}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-slate-300">{label}</div>
      <input className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
