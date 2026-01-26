import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'admin' | 'user' | 'seller' }) {
  const { isAuthed, loading, role: myRole } = useAuth();
  if (loading) return <div className="p-6">Loading...</div>;
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (role && myRole !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
