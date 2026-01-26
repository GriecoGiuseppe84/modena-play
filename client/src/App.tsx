// client/src/App.tsx
import React, { useState } from 'react';
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
  // opzionale: se vuoi poter “sbloccare” l’UI solo dopo lo splash
  const [splashDone, setSplashDone] = useState(false);

  return (
    <BrowserRouter>
      {/* Splash: SEMPRE (once={false}) */}
      <SplashIntro
        once={false}
        totalMs={3600}
        onDone={() => setSplashDone(true)}
        logoSrc="/logos/modenaplay_logo.svg"
      />

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
  );
}
