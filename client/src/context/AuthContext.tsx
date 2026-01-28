import React, { createContext, useContext, useMemo, useState } from 'react';
import { api, setToken, getToken } from '../services/api';

type AuthKind = 'admin' | 'user';

type AuthState = {
  token: string | null;
  kind: AuthKind | null;
  email: string | null;
};

type AuthCtx = AuthState & {
  loginUser(email: string, password: string): Promise<void>;
  registerUser(email: string, password: string): Promise<{ needsEmailConfirmation: boolean }>;
  loginAdmin(email: string, password: string): Promise<void>;
  logout(): void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokenState, setTokenState] = useState<string | null>(getToken());
  const [kind, setKind] = useState<AuthKind | null>(localStorage.getItem('mp_kind') as AuthKind | null);
  const [email, setEmail] = useState<string | null>(localStorage.getItem('mp_email'));

  const logout = () => {
    setToken(null);
    setTokenState(null);
    setKind(null);
    setEmail(null);
    localStorage.removeItem('mp_kind');
    localStorage.removeItem('mp_email');
  };

  const loginUser = async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    setToken(data.token);
    setTokenState(data.token);
    setKind('user');
    setEmail(email);
    localStorage.setItem('mp_kind', 'user');
    localStorage.setItem('mp_email', email);
  };

  const registerUser = async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/register', { email, password });

    // se arriva token lo salviamo, altrimenti serve conferma email
    if (data.token) {
      setToken(data.token);
      setTokenState(data.token);
      setKind('user');
      setEmail(email);
      localStorage.setItem('mp_kind', 'user');
      localStorage.setItem('mp_email', email);
    }

    return { needsEmailConfirmation: Boolean(data.needsEmailConfirmation) };
  };

  const loginAdmin = async (email: string, password: string) => {
    const { data } = await api.post('/api/admin/login', { email, password });
    setToken(data.token);
    setTokenState(data.token);
    setKind('admin');
    setEmail(email);
    localStorage.setItem('mp_kind', 'admin');
    localStorage.setItem('mp_email', email);
  };

  const value = useMemo(
    () => ({
      token: tokenState,
      kind,
      email,
      loginUser,
      registerUser,
      loginAdmin,
      logout,
    }),
    [tokenState, kind, email]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
