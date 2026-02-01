import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({
  children,
  role,
  redirectTo = '/login',
}: {
  children: React.ReactNode;
  role?: string;
  redirectTo?: string;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to={redirectTo} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
