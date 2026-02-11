import React, { useEffect, useState } from 'react';
import { consumeFlash } from '../../services/api';

export default function FlashBanner() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const v = consumeFlash();
    if (v) setMsg(v);
  }, []);

  if (!msg) return null;

  return (
    <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-amber-200">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm">
          <div className="font-bold">Attenzione</div>
          <div className="opacity-90">{msg}</div>
        </div>
        <button className="text-xs underline opacity-80 hover:opacity-100" onClick={() => setMsg(null)}>
          chiudi
        </button>
      </div>
    </div>
  );
}
