import React from 'react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <>
      <section className="hero bg-gradient-to-r from-modena-navy to-black py-20">
        <div className="container mx-auto text-center px-4">
          <img
            src="/logos/modenaplay_logo.png"
            alt="Modena Play"
            className="logo-hero mx-auto h-32 lg:h-48 mb-8"
            loading="lazy"
          />
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
            Il Tuo Hub Gaming Italiano
          </h1>
          <p className="text-xl md:text-2xl text-modena-gold mb-8 opacity-90">
            Board Games • Warhammer • Magic • Digital
          </p>
          <Link to="/admin/dashboard" className="btn-primary">
            Accedi Admin →
          </Link>
        </div>
      </section>

      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-black">Affiliate Hub (MVP)</h2>
        <p className="text-slate-400 mt-2">
          Base tecnica pronta per: blog + link tracking + dashboard admin. Admin: /admin/setup o /admin/dashboard.
        </p>
      </div>
    </>
  );
}