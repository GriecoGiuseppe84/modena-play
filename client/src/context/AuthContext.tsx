import React, { createContext, useContext, useMemo, useState } from 'react';
import { api, setToken, getToken } from '../services/api';

export type UserRole = 'user' | 'seller';
export type AuthKind = 'admin' | 'user';
export type AppRole = 'admin' | UserRole;

export type AuthUser = {
  kind: AuthKind;
  role: AppRole;
  email: string | null;
};

type AuthState = {
  token: string | null;
  kind: AuthKind | null;
  role: AppRole | null;
  email: string | null;
};

type AuthCtx = AuthState & {
  // compat layer for older components in this repo
  isAuthed: boolean;
  loading: boolean;
  user: AuthUser | null;

  loginUser(email: string, password: string): Promise<{ role: UserRole }>;
  registerUser(
    email: string,
    password: string,
    role: UserRole
  ): Promise<{ needsEmailConfirmation: boolean; role: UserRole }>;
  loginAdmin(email: string, password: string): Promise<void>;

  requestPasswordReset(email: string): Promise<void>;

  logout(): void;
  doLogout(): Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function readKind(): AuthKind | null {
  const v = localStorage.getItem('mp_kind');
  return v === 'admin' || v === 'user' ? (v as AuthKind) : null;
}

function readRole(): AppRole | null {
  const v = localStorage.getItem('mp_role');
  return v === 'admin' || v === 'user' || v === 'seller' ? (v as AppRole) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokenState, setTokenState] = useState<string | null>(getToken());
  const [kind, setKind] = useState<AuthKind | null>(readKind());
  const [role, setRole] = useState<AppRole | null>(readRole());
  const [email, setEmail] = useState<string | null>(localStorage.getItem('mp_email'));

  const logout = () => {
    setToken(null);
    setTokenState(null);
    setKind(null);
    setRole(null);
    setEmail(null);
    localStorage.removeItem('mp_kind');
    localStorage.removeItem('mp_role');
    localStorage.removeItem('mp_email');
  };

  const loginUser = async (emailIn: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email: emailIn, password });

    const serverRole: UserRole = data?.user?.role === 'seller' ? 'seller' : 'user';

    setToken(data.token);
    setTokenState(data.token);
    setKind('user');
    setRole(serverRole);
    setEmail(data?.user?.email ?? emailIn);

    localStorage.setItem('mp_kind', 'user');
    localStorage.setItem('mp_role', serverRole);
    localStorage.setItem('mp_email', data?.user?.email ?? emailIn);

    return { role: serverRole };
  };

  const registerUser = async (emailIn: string, password: string, desiredRole: UserRole) => {
    const { data } = await api.post('/api/auth/register', {
      email: emailIn,
      password,
      role: desiredRole,
    });

    const needsEmailConfirmation = Boolean(data.needsEmailConfirmation);

    // se arriva token lo salviamo, altrimenti serve conferma email
    if (data.token) {
      const serverRole: UserRole = data?.user?.role === 'seller' ? 'seller' : desiredRole;

      setToken(data.token);
      setTokenState(data.token);
      setKind('user');
      setRole(serverRole);
      setEmail(data?.user?.email ?? emailIn);

      localStorage.setItem('mp_kind', 'user');
      localStorage.setItem('mp_role', serverRole);
      localStorage.setItem('mp_email', data?.user?.email ?? emailIn);

      return { needsEmailConfirmation, role: serverRole };
    }

    return { needsEmailConfirmation, role: desiredRole };
  };

  const loginAdmin = async (emailIn: string, password: string) => {
    const { data } = await api.post('/api/admin/login', { email: emailIn, password });
    setToken(data.token);
    setTokenState(data.token);
    setKind('admin');
    setRole('admin');
    setEmail(emailIn);
    localStorage.setItem('mp_kind', 'admin');
    localStorage.setItem('mp_role', 'admin');
    localStorage.setItem('mp_email', emailIn);
  };

  const requestPasswordReset = async (emailIn: string) => {
    await api.post('/api/auth/forgot-password', { email: emailIn });
  };

  const isAuthed = Boolean(tokenState);
  const user: AuthUser | null = isAuthed && kind && role ? { kind, role, email } : null;
  const loading = false;

  const value = useMemo<AuthCtx>(
    () => ({
      token: tokenState,
      kind,
      role,
      email,
      isAuthed,
      loading,
      user,
      loginUser,
      registerUser,
      loginAdmin,
      requestPasswordReset,
      logout,
      doLogout: async () => logout(),
    }),
    [tokenState, kind, role, email, isAuthed]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
