import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import OnboardingPlaybook from '../components/OnboardingPlaybook';

export default function UserDashboard() {
  const nav = useNavigate();
  const { email, logout } = useAuth();
  return (
    <ProtectedRoute role="user">
      <AppShell
        title="Area Utente"
        subtitle="Qui trovi il Playbook per far partire ModenaGiochi in modo intelligente: prima audience & affiliate, poi (se conviene) scale verso ecommerce." 
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
        <div className="text-xs text-slate-300 mb-4">
          <span className="mp-badge">👤 {email ?? '—'}</span>
        </div>

        <OnboardingPlaybook email={email} />
      </AppShell>
    </ProtectedRoute>
  );
}
