import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type JwtPayload = {
  sub: string;
  email: string;
  role: 'admin' | 'user' | 'seller';
  iat: number;
  exp: number;
};

export function requireAuth(req: Request & { user?: any }, res: Response, next: NextFunction) {
  const h = String(req.headers.authorization ?? '');
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as JwtPayload;
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(role: 'admin'|'user'|'seller') {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Missing user' });
    if (req.user.role !== role) return res.status(403).json({ error: `${role} only` });
    return next();
  };
}
