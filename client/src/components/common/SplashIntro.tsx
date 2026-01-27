import React, { useEffect, useState } from 'react';
import logo from '../../assets/modenaplay-logo.svg';

export default function SplashIntro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'in'|'out'>('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('out'), 1200);
    const t2 = setTimeout(() => onDone(), 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
      <div className={`transition-all duration-500 ${phase === 'in' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <img src={logo} alt="Modena Play" className="w-[280px] md:w-[360px] drop-shadow-[0_0_40px_rgba(99,102,241,0.25)]" />
        <div className="mt-4 text-center text-xs text-slate-500">Affiliate Platform MVP</div>
      </div>
    </div>
  );
}
