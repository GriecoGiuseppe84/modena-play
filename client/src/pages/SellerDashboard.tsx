import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import OnboardingPlaybook from '../components/OnboardingPlaybook';

export default function SellerDashboard() {
  const nav = useNavigate();
  const { email, logout } = useAuth();

  return (
    <ProtectedRoute role="seller">
      <AppShell
        title="Area Seller"
        subtitle="In questa fase il marketplace viene abilitato in modo progressivo. Intanto puoi usare il Playbook Affiliate per costruire traffico e domanda." 
        right={
          <>
            <Link className="mp-btn-secondary" to="/">Home</Link>
            <button
              onClick={() => {
                logout();
                nav('/login', { replace: true });
              }}
              className="mp-btn-danger"
            >
              Logout
            </button>
          </>
        }
      >
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <div className="mp-card p-5">
            <div className="mp-badge">🏪 Marketplace</div>
            <div className="mt-2 text-sm text-slate-300">
              Moduli in arrivo: profilo venditore, catalogo, ordini, analytics.
            </div>
            <div className="mt-4 text-xs text-slate-400">
              Per ora l'obiettivo è validare e portare traffico.
            </div>
          </div>
          <div className="mp-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Account</div>
                <div className="text-xs text-slate-400 mt-1">{email ?? '—'}</div>
              </div>
              <span className="mp-badge text-modena-gold border-modena-gold/30 bg-modena-gold/10">Seller</span>
            </div>
            <div className="mt-3 text-sm text-slate-300">
              Consiglio pratico: inizia subito con contenuti affiliate (playbook sotto). Quando hai numeri, apriamo le funzioni marketplace.
            </div>
          </div>
        </div>

        <OnboardingPlaybook email={email} />
      </AppShell>
    </ProtectedRoute>
  );
}
