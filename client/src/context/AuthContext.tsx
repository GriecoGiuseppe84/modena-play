import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { adminLogin, refreshAccessToken, logout } from '../services/auth';

type AuthState = {
  isAuthed: boolean;
  role: 'admin' | 'user' | 'seller' | null;
  accessToken: string | null;
  loading: boolean;
};

type AuthCtx = AuthState & {
  loginAdmin: (email: string, password: string) => Promise<void>;
  doLogout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthed: false,
    role: null,
    accessToken: null,
    loading: true,
  });

  useEffect(() => {
    // try refresh on mount (admin only)
    (async () => {
      try {
        const r = await refreshAccessToken();
        setState({ isAuthed: true, role: r.role as any, accessToken: r.accessToken, loading: false });
      } catch {
        setState((s) => ({ ...s, loading: false }));
      }
    })();
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    ...state,
    loginAdmin: async (email, password) => {
      const r = await adminLogin(email, password);
      setState({ isAuthed: true, role: r.role as any, accessToken: r.accessToken, loading: false });
    },
    doLogout: async () => {
      await logout();
      setState({ isAuthed: false, role: null, accessToken: null, loading: false });
    },
  }), [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthContext missing');
  return v;
}
