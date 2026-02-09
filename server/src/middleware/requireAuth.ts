import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../lib/jwt';
import { supabaseAnon, supabaseService } from '../lib/supabase';

export type AuthUser =
  | { kind: 'admin'; sub: string; email?: string; role: 'admin' }
  | { kind: 'user'; sub: string; email?: string; role: 'user' | 'seller' };

declare global {
  // eslint-disable-next-line no-var
  var __authUser: AuthUser | undefined;
}

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: AuthUser;
  }
}

function getBearer(req: Request) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getBearer(req);
  if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' });

  // 1) prova JWT nostro (admin)
  try {
    const p = verifyJwt(token);
    if (p.role === 'admin') {
      req.authUser = { kind: 'admin', sub: p.sub, email: p.email, role: 'admin' };
      return next();
    }
  } catch {
    // ignore
  }

  // 2) prova token Supabase (user)
  const authClient = supabaseService ?? supabaseAnon;

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' });

  const role = ((data.user.user_metadata as any)?.role ?? 'user') as 'user' | 'seller';
  req.authUser = { kind: 'user', sub: data.user.id, email: data.user.email ?? undefined, role };
  return next();
}
