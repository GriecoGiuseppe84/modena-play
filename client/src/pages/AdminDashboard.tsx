import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

type LinkRow = {
  id: string;
  title: string;
  destination_url: string;
  click_count: number;
  conversion_count: number;
  commission_rate: number;
  status: string;
};

type Summary = {
  clicksToday: number;
  revenueThisMonth: string;
  conversionRate: number;
};

export default function AdminDashboard() {
  const nav = useNavigate();
  const { kind, email, logout } = useAuth();

  const [items, setItems] = useState<LinkRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [source_url, setSource] = useState('');
  const [destination_url, setDest] = useState('');
  const [category, setCategory] = useState('general');
  const [commission_rate, setCommission] = useState(0.05);
  const [status, setStatus] = useState<'active' | 'paused' | 'archived'>('active');

  // gate admin
  useEffect(() => {
    if (kind !== 'admin') nav('/admin/login', { replace: true });
  }, [kind, nav]);

  async function load() {
    setError(null);
    const linksRes = await api.get<{ items: LinkRow[] }>('/api/admin/links');
    setItems(linksRes.data.items);

    const sumRes = await api.get<Summary>('/api/admin/analytics/summary');
    setSummary(sumRes.data);
  }

  useEffect(() => {
    load().catch((e: any) => {
      const msg = e?.response?.data?.error || e?.message || 'Errore caricamento';
      setError(msg);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate() {
    setError(null);
    await api.post('/api/admin/links', {
      title,
      source_url,
      destination_url,
      category,
      commission_rate,
      status,
    });
    setTitle('');
    setSource('');
    setDest('');
    await load();
  }

  async function onToggle(id: string, cur: string) {
    setError(null);
    await api.patch(`/api/admin/links/${id}`, {
      status: cur === 'active' ? 'paused' : 'active',
    });
    await load();
  }

  async function onDelete(id: string) {
    setError(null);
    await api.delete(`/api/admin/links/${id}`);
    await load();
  }

  async function onLogout() {
    logout();
    nav('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen p-6 bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Admin Dashboard</h1>
            <div className="text-xs text-slate-400">{email ?? '—'}</div>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-2 rounded bg-red-700 hover:bg-red-600 font-semibold"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-red-900 bg-red-950/40 text-red-200 text-sm">
            {error}
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
              <div className="text-xs text-slate-400">Clicks Today</div>
              <div className="text-2xl font-black">{summary.clicksToday}</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
              <div className="text-xs text-slate-400">Revenue Month</div>
              <div className="text-2xl font-black">€{summary.revenueThisMonth}</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
              <div className="text-xs text-slate-400">Conversion</div>
              <div className="text-2xl font-black">
                {Math.round(summary.conversionRate * 100)}%
              </div>
            </div>
          </div>
        )}

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
          <div className="font-black">+ New Link</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded bg-slate-900 border border-slate-800"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded bg-slate-900 border border-slate-800"
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded bg-slate-900 border border-slate-800"
              placeholder="Source URL"
              value={source_url}
              onChange={(e) => setSource(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded bg-slate-900 border border-slate-800"
              placeholder="Destination URL"
              value={destination_url}
              onChange={(e) => setDest(e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              className="px-3 py-2 rounded bg-slate-900 border border-slate-800"
              value={commission_rate}
              onChange={(e) => setCommission(Number(e.target.value))}
            />
            <select
              className="px-3 py-2 rounded bg-slate-900 border border-slate-800"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <button
            onClick={() => onCreate().catch((e: any) => setError(e?.response?.data?.error || e?.message || 'Errore'))}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 font-semibold"
          >
            Crea
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/60">
              <tr className="text-left">
                <th className="p-3">Title</th>
                <th className="p-3">Clicks</th>
                <th className="p-3">Conv</th>
                <th className="p-3">Commission</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-slate-800">
                  <td className="p-3">
                    <div className="font-semibold">{it.title}</div>
                    <div className="text-xs text-slate-400 break-all">{it.destination_url}</div>
                  </td>
                  <td className="p-3">{it.click_count}</td>
                  <td className="p-3">{it.conversion_count}</td>
                  <td className="p-3">{Math.round(it.commission_rate * 100)}%</td>
                  <td className="p-3">{it.status}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onToggle(it.id, it.status).catch((e: any) => setError(e?.response?.data?.error || e?.message || 'Errore'))}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 mr-2"
                    >
                      Toggle
                    </button>
                    <button
                      onClick={() => onDelete(it.id).catch((e: any) => setError(e?.response?.data?.error || e?.message || 'Errore'))}
                      className="px-2 py-1 rounded bg-red-700 hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={6} className="p-6 text-slate-500">
                    Nessun link ancora.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
