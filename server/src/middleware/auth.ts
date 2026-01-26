import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { supabaseAdmin } from '../database/supabase';
import type { JwtClaims, Role } from '../types';

type AuthedReq = Request & { auth?: { userId: string; email: string; role: Role; jti?: string } };

async function isRevoked(jti: string): Promise<boolean> {
  // token revoke list stored in audit_log as TOKEN_REVOKE with changes.jti
  const { data, error } = await supabaseAdmin
    .from('audit_log')
    .select('id')
    .eq('action', 'TOKEN_REVOKE')
    .contains('changes', { jti })
    .limit(1);

  if (error) return false; // fail-open to avoid blocking on DB issue; logs handled elsewhere
  return (data?.length ?? 0) > 0;
}

export function requireAuth(requiredRole?: Role) {
  return async (req: AuthedReq, res: Response, next: NextFunction) => {
    try {
      const header = req.header('authorization') ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;

      if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' });

      const claims = jwt.verify(token, ENV.JWT_SECRET, {
        issuer: ENV.JWT_ISSUER,
        audience: ENV.JWT_AUDIENCE,
      }) as JwtClaims;

      if (claims.type !== 'access') return res.status(401).json({ error: 'Invalid token type' });
      if (await isRevoked(claims.jti)) return res.status(401).json({ error: 'Token revoked' });

      req.auth = { userId: claims.sub, email: claims.email, role: claims.role, jti: claims.jti };

      if (requiredRole && req.auth.role !== requiredRole) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      return next();
    } catch (e: any) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

export async function resolveProfileRole(userId: string): Promise<Role> {
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).maybeSingle();
  return (data?.role as Role) ?? 'user';
}
