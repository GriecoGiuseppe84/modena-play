import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Blog from '../pages/Blog';
import Marketplace from '../pages/Marketplace';
import NotFound from '../pages/NotFound';

export default function PublicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
