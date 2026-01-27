import React, { useEffect, useMemo, useState } from 'react';
import logo from '../../assets/modenaplay-logo.svg';

export default function SplashIntro({ onDone }: { onDone: () => void }) {
  const totalMs = 2600;
  const [done, setDone] = useState(false);
  const [t, setT] = useState(0);

  const pct = useMemo(() => Math.min(100, Math.round((t / totalMs) * 100)), [t]);

  useEffect(() => {
    const started = Date.now();
    const tick = setInterval(() => setT(Date.now() - started), 50);
    const end = setTimeout(() => {
      setDone(true);
      setTimeout(onDone, 250);
    }, totalMs);

    return () => {
      clearInterval(tick);
      clearTimeout(end);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
      <div className={`transition-all duration-500 ${done ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}>
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute -inset-6 blur-2xl opacity-40 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-full" />
            <img
              src={logo}
              alt="Modena Play"
              className="relative w-[280px] md:w-[420px] drop-shadow-[0_0_40px_rgba(99,102,241,0.25)]"
            />
          </div>

          <div className="mt-4 text-center">
            <div className="text-sm text-slate-300 font-semibold">Affiliate Platform MVP</div>
            <div className="text-xs text-slate-500 mt-1">Caricamento interfaccia…</div>
          </div>

          <div className="mt-6 w-[260px] md:w-[340px]">
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-2 bg-gradient-to-r from-indigo-500 to-emerald-500 transition-[width] duration-100"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-500">
              <span>{pct}%</span>
              <button
                className="hover:text-slate-300"
                onClick={() => {
                  setDone(true);
                  setTimeout(onDone, 150);
                }}
              >
                Salta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
