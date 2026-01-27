import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import HomePage from './pages/HomePage';
import SignupPage from './pages/SignupPage';
import UserLoginPage from './pages/UserLoginPage';
import AdminLoginPage from './pages/AdminLoginPage';

import AdminSetupPage from './pages/AdminSetupPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

import UserDashboardPage from './pages/UserDashboardPage';
import SellerDashboardPage from './pages/SellerDashboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* Public auth */}
      <Route path="/login" element={<UserLoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Admin auth on dedicated URL */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/setup" element={<AdminSetupPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

      {/* Minimal areas */}
      <Route path="/user/dashboard" element={<UserDashboardPage />} />
      <Route path="/seller/dashboard" element={<SellerDashboardPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
