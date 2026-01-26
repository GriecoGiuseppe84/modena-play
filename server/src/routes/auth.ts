import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { SECURITY } from '../config/security';
import { schemas } from '../utils/validators';
import { randomId } from '../utils/crypto';
import { supabaseAdmin } from '../database/supabase';
import type { JwtClaims, Role } from '../types';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

function signToken(args: { sub: string; email: string; role: Role; type: 'access' | 'refresh'; ttlSeconds: number; jti: string }) {
  const now = Math.floor(Date.now() / 1000);
  const claims: JwtClaims = {
    sub: args.sub,
    email: args.email,
    role: args.role,
    type: args.type,
    jti: args.jti,
    iss: ENV.JWT_ISSUER,
    aud: ENV.JWT_AUDIENCE,
    iat: now,
    exp: now + args.ttlSeconds,
  };
  return jwt.sign(claims, ENV.JWT_SECRET);
}

authRouter.post('/admin/login', async (req, res) => {
  const { error, value } = schemas.adminLogin.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json({ error: 'Invalid input', details: error.details.map((d) => d.message) });

  const email = String(value.email).trim().toLowerCase();
  const password = String(value.password);

  if (email !== ENV.ADMIN_EMAIL || password !== ENV.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // ensure admin profile exists (by email) - in setup we create, but we keep this safe
  const { data: prof } = await supabaseAdmin.from('profiles').select('id, email, role').eq('email', ENV.ADMIN_EMAIL).maybeSingle();
  const userId = prof?.id ?? ENV.ADMIN_EMAIL; // fallback; setup should bind real uuid
  const role: Role = 'admin';

  const accessJti = randomId();
  const refreshJti = randomId();

  const access = signToken({ sub: String(userId), email, role, type: 'access', ttlSeconds: SECURITY.ACCESS_TOKEN_TTL_SECONDS, jti: accessJti });
  const refresh = signToken({ sub: String(userId), email, role, type: 'refresh', ttlSeconds: SECURITY.REFRESH_TOKEN_TTL_SECONDS, jti: refreshJti });

  res.cookie('mg_refresh', refresh, {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: ENV.COOKIE_DOMAIN === 'localhost' ? undefined : ENV.COOKIE_DOMAIN,
    path: '/api/auth',
    maxAge: SECURITY.REFRESH_TOKEN_TTL_SECONDS * 1000,
  });

  res.json({ accessToken: access, role: 'admin' });
});

authRouter.post('/refresh', async (req, res) => {
  const token = req.cookies?.mg_refresh;
  if (!token) return res.status(401).json({ error: 'Missing refresh token' });

  try {
    const claims = jwt.verify(token, ENV.JWT_SECRET, { issuer: ENV.JWT_ISSUER, audience: ENV.JWT_AUDIENCE }) as JwtClaims;
    if (claims.type !== 'refresh') return res.status(401).json({ error: 'Invalid token type' });

    const access = signToken({
      sub: claims.sub,
      email: claims.email,
      role: claims.role,
      type: 'access',
      ttlSeconds: SECURITY.ACCESS_TOKEN_TTL_SECONDS,
      jti: randomId(),
    });

    res.json({ accessToken: access, role: claims.role });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

authRouter.post('/logout', requireAuth(), async (req: any, res) => {
  // Revoke current access token jti (best-effort)
  const jti = req.auth?.jti;
  if (jti) {
    await supabaseAdmin.from('audit_log').insert({
      action: 'TOKEN_REVOKE',
      actor_id: req.auth.userId,
      resource_type: 'token',
      resource_id: req.auth.userId,
      changes: { jti, reason: 'logout' },
    });
  }

  res.clearCookie('mg_refresh', { path: '/api/auth' });
  res.json({ ok: true });
});
