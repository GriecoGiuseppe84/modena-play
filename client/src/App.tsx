import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import HomePage from './pages/HomePage';
import SignupPage from './pages/SignupPage';
import UserLoginPage from './pages/UserLoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminLoginPage from './pages/AdminLoginPage';

import AdminSetupPage from './pages/AdminSetupPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminAffiliateLinksPage from './pages/AdminAffiliateLinksPage';
import AdminContentPage from './pages/AdminContentPage';

import AffiliateRedirectPage from './pages/AffiliateRedirectPage';
import ResourcesPage from './pages/ResourcesPage';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Offers from './pages/Offers';

import UserDashboardPage from './pages/UserDashboardPage';
import SellerDashboardPage from './pages/SellerDashboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* Public resources landing */}
      <Route path="/risorse" element={<ResourcesPage />} />
      <Route path="/resources" element={<Navigate to="/risorse" replace />} />

      {/* Public offers */}
      <Route path="/offerte" element={<Offers />} />
      <Route path="/offers" element={<Navigate to="/offerte" replace />} />

      {/* Public blog */}
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />

      {/* Public short-link redirect (tracks click server-side) */}
      <Route path="/r/:slug" element={<AffiliateRedirectPage />} />

      {/* Public auth */}
      <Route path="/login" element={<UserLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Admin auth on dedicated URL */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      {/* Legacy path kept for compatibility */}
      <Route path="/admin/setup" element={<Navigate to="/admin/diagnostics" replace />} />
      <Route path="/admin/diagnostics" element={<AdminSetupPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/admin/affiliate-links" element={<AdminAffiliateLinksPage />} />
      <Route path="/admin/content" element={<AdminContentPage />} />

      {/* Minimal areas */}
      <Route path="/user/dashboard" element={<UserDashboardPage />} />
      <Route path="/seller/dashboard" element={<SellerDashboardPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
