import React, { createContext, useContext, useMemo, useState } from 'react';
import type { User } from '../services/auth';
import { getStoredUser } from '../services/auth';

type AuthCtx = { user: User | null; setUser: (u: User | null) => void; };

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const value = useMemo(() => ({ user, setUser }), [user]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthContext missing');
  return v;
}
