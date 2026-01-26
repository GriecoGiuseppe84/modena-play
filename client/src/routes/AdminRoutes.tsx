import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminPanel from '../pages/AdminPanel';
import ProtectedRoute from '../components/auth/ProtectedRoute';

export default function AdminRoutes() {
  return (
    <ProtectedRoute role="admin">
      <Routes>
        <Route path="/admin/setup" element={<AdminPanel mode="setup" />} />
        <Route path="/admin/dashboard" element={<AdminPanel mode="dashboard" />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </ProtectedRoute>
  );
}
