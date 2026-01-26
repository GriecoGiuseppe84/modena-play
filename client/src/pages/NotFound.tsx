import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto p-10 text-center">
      <h1 className="text-4xl font-black">404</h1>
      <p className="text-slate-400 mt-3">Pagina non trovata.</p>
      <Link className="inline-block mt-6 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold" to="/">Torna Home</Link>
    </div>
  );
}
