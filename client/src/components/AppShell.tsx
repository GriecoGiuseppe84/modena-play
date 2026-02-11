import React from 'react';
import FlashBanner from './common/FlashBanner';
import { Link } from 'react-router-dom';
import logo from '../assets/modenaplay-logo.svg';

type Props = {
  children: React.ReactNode;
  right?: React.ReactNode;
  compact?: boolean;
  /** optional page title shown under the top bar */
  title?: string;
  subtitle?: string;
};

export default function AppShell({ children, right, compact = false, title, subtitle }: Props) {
  return (
    <div className="min-h-screen text-slate-100 bg-modena-black relative overflow-hidden">
      {/* ambient gradients */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(0,229,255,0.22), transparent 60%),' +
            'radial-gradient(40% 40% at 80% 10%, rgba(255,215,0,0.10), transparent 60%),' +
            'radial-gradient(40% 40% at 20% 30%, rgba(26,35,126,0.35), transparent 60%)',
        }}
      />

      <div className={(compact ? 'max-w-3xl' : 'max-w-6xl') + ' mx-auto px-5 md:px-8 pt-8 pb-12'}>
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Modena Play" className="h-10 md:h-11" />
            <div className="hidden sm:block">
              <div className="text-xs uppercase tracking-wider text-slate-400">Il tuo hub gaming italiano</div>
              <div className="text-sm text-slate-200 font-semibold">Modena Play</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">{right}</div>
        </header>

        {(title || subtitle) && (
          <div className="mt-8">
            {title && <h1 className="text-3xl md:text-4xl font-black">{title}</h1>}
            {subtitle && <p className="mt-2 text-slate-300 max-w-3xl">{subtitle}</p>}
          </div>
        )}

        <FlashBanner />

        <main className="mt-8">{children}</main>
      </div>
    </div>
  );
}
