import React from 'react';
import ProtectedRoute from '../components/ProtectedRoute';

export default function SellerDashboard() {
  return (
    <ProtectedRoute role="seller">
      <div className="min-h-screen p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-black">Seller Dashboard (placeholder)</h1>
          <p className="text-slate-400 mt-2">Area minima pronta: route + layout.</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
