import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10 text-sm text-slate-400">
        © {new Date().getFullYear()} Modena Play • Affiliate Platform MVP
      </div>
    </footer>
  );
}
