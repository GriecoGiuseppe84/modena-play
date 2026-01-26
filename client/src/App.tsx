import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';

import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import SplashIntro from './components/SplashIntro';

import Dashboard from './pages/Dashboard';
import Blog from './pages/Blog';
import Marketplace from './pages/Marketplace';
import NotFound from './pages/NotFound';

import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';

import AdminPanel from './pages/AdminPanel';
import ProtectedRoute from './components/auth/ProtectedRoute';

export default function App() {
  return (
    <>
      <SplashIntro />
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/marketplace" element={<Marketplace />} />

              {/* Auth */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Admin (protected) */}
              <Route
                path="/admin/setup"
                element={
                  <ProtectedRoute role="admin">
                    <AdminPanel mode="setup" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute role="admin">
                    <AdminPanel mode="dashboard" />
                  </ProtectedRoute>
                }
              />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </>
  );
}
