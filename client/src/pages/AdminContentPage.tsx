import React from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import ContentManager from '../components/admin/ContentManager';

export default function AdminContentPage() {
  const { logout } = useAuth();

  return (
    <ProtectedRoute role="admin" redirectTo="/admin/login">
      <AppShell
        title="Content"
        subtitle="Crea guide e articoli in stile magazine (focus: gaming, offerte, hardware & gear)."
        right={
          <>
            <Link className="mp-btn-secondary" to="/admin/dashboard">Control Room</Link>
            <Link className="mp-btn-secondary" to="/admin/diagnostics">Diagnostica DB</Link>
            <Link className="mp-btn-secondary" to="/admin/affiliate-links">Affiliate Links</Link>
            <Link className="mp-btn-secondary" to="/">Home</Link>
            <button
              onClick={() => {
                logout();
                window.location.href = '/admin/login';
              }}
              className="mp-btn-danger"
            >
              Logout
            </button>
          </>
        }
      >
        <div className="max-w-6xl mx-auto">
          <ContentManager />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
