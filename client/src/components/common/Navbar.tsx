import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function navClass({ isActive }: { isActive: boolean }) {
  return `px-3 py-2 rounded-lg text-sm font-semibold ${isActive ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-900'}`;
}

export default function Navbar() {
  const { isAuthed, role, doLogout } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link to="/" className="text-lg font-black tracking-tight text-white">Modena Play</Link>

        <nav className="ml-auto flex items-center gap-2">
          <NavLink to="/blog" className={navClass}>Blog</NavLink>
          <NavLink to="/marketplace" className={navClass}>Marketplace</NavLink>
          {role === 'admin' && <NavLink to="/admin/dashboard" className={navClass}>Admin</NavLink>}
          {!isAuthed ? (
            <NavLink to="/login" className={navClass}>Login</NavLink>
          ) : (
            <button onClick={() => void doLogout()} className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 hover:bg-slate-700">
              Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
