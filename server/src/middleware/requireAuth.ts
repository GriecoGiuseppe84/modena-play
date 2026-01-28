import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../lib/jwt';
import { supabaseService } from '../lib/supabase';

export type AuthUser =
  | { kind: 'admin'; sub: string; email?: string }
  | { kind: 'user'; sub: string; email?: string };

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
      req.authUser = { kind: 'admin', sub: p.sub, email: p.email };
      return next();
    }
  } catch {
    // ignore
  }

  // 2) prova token Supabase (user)
  if (!supabaseService) {
    return res.status(401).json({ error: 'Invalid token (no service role to validate user token)' });
  }

  const { data, error } = await supabaseService.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' });

  req.authUser = { kind: 'user', sub: data.user.id, email: data.user.email ?? undefined };
  return next();
}
