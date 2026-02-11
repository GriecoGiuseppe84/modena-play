import React, { useMemo, useState } from 'react';
import { useAffiliateLinks } from '../../hooks/useAffiliateLinks';
import type { AffiliateLink } from '../../types';

export default function LinkManager() {
  const { data, isLoading, create, update } = useAffiliateLinks();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [source_url, setSourceUrl] = useState('');
  const [destination_url, setDestUrl] = useState('');
  const [network, setNetwork] = useState('generic');
  const [is_active, setIsActive] = useState(true);

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Link affiliati</h2>
        <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black">
          + Nuovo link
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-slate-300">
            <tr>
              <th className="text-left p-3">Titolo</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Network</th>
              <th className="text-right p-3">Clicks</th>
              <th className="text-left p-3">Stato</th>
              <th className="text-right p-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="p-4 text-slate-400" colSpan={6}>Caricamento…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-4 text-slate-400" colSpan={6}>Nessun link.</td></tr>
            ) : (
              rows.map((r: AffiliateLink) => (
                <tr key={r.id} className="border-t border-slate-800">
                  <td className="p-3">
                    <div className="font-black">{r.title}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[420px]">{r.destination_url}</div>
                  </td>
                  <td className="p-3 text-slate-300">/{r.slug}</td>
                  <td className="p-3 text-slate-300">{r.network}</td>
                  <td className="p-3 text-right text-slate-200 font-black">{r.click_count ?? 0}</td>
                  <td className="p-3">
                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${r.is_active ? 'bg-emerald-900/40 text-emerald-200 border border-emerald-900' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                      {r.is_active ? 'ATTIVO' : 'PAUSA'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => update.mutate({ id: r.id, patch: { is_active: !r.is_active } })}
                      className="px-3 py-2 rounded-xl bg-slate-900/30 border border-slate-800 hover:bg-slate-800/50 text-sm font-black"
                    >
                      {r.is_active ? 'Pausa' : 'Attiva'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">Nuovo link</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="text-sm text-slate-300">
                Titolo
                <input value={title} onChange={(e)=>setTitle(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900/30 border border-slate-800 outline-none focus:border-slate-600" />
              </label>
              <label className="text-sm text-slate-300">
                URL destinazione
                <input value={destination_url} onChange={(e)=>setDestUrl(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900/30 border border-slate-800 outline-none focus:border-slate-600" />
              </label>
              <label className="text-sm text-slate-300">
                URL sorgente (facoltativo)
                <input value={source_url} onChange={(e)=>setSourceUrl(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900/30 border border-slate-800 outline-none focus:border-slate-600" />
              </label>
              <label className="text-sm text-slate-300">
                Network
                <input value={network} onChange={(e)=>setNetwork(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900/30 border border-slate-800 outline-none focus:border-slate-600" />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={is_active} onChange={(e)=>setIsActive(e.target.checked)} />
                Attivo
              </label>

              <button
                disabled={!title.trim() || !destination_url.trim() || create.isPending}
                onClick={() => {
                  create.mutate({ title, destination_url, source_url, network, is_active });
                  setOpen(false);
                  setTitle(''); setDestUrl(''); setSourceUrl(''); setNetwork('generic'); setIsActive(true);
                }}
                className="mt-1 px-4 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black disabled:opacity-50"
              >
                Crea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
