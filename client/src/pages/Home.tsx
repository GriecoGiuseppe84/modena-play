import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-3xl font-black">Modena Play</h1>
        <p className="text-slate-400">
          MVP: Admin Setup Wizard + Dashboard Affiliate. Include anche area minima User/Seller (placeholder UI).
        </p>
        <div className="flex gap-3">
          <Link className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 font-semibold" to="/login">Login</Link>
          <Link className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 font-semibold" to="/signup">Signup (minimo)</Link>
        </div>
      </div>
    </div>
  );
}
