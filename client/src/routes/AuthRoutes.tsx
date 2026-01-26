import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from '../components/auth/LoginPage';
import SignupPage from '../components/auth/SignupPage';

export default function AuthRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
    </Routes>
  );
}
