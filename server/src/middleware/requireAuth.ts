import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../lib/jwt';

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

  // ✅ Single source of truth: our JWT (admin + user/seller)
  try {
    const p = verifyJwt(token);
    if (p.role === 'admin') {
      req.authUser = { kind: 'admin', sub: p.sub, email: p.email, role: 'admin' };
      return next();
    }
    if (p.role === 'user' || p.role === 'seller') {
      req.authUser = { kind: 'user', sub: p.sub, email: p.email, role: p.role };
      return next();
    }
    return res.status(401).json({ error: 'Invalid token role' });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
