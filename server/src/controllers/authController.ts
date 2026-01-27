import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../database/pg';
import { randomToken, sha256 } from '../utils/crypto';

function signAccessToken(payload: { sub: string; email: string; role: any }) {
  const secret = process.env.JWT_SECRET || '';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export async function adminLogin(req: Request, res: Response) {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || '');

  if (!adminEmail || !adminPassword) return res.status(500).json({ error: 'Admin env missing' });
  if (email !== adminEmail || password !== adminPassword) return res.status(401).json({ error: 'Invalid credentials' });

  // Stable admin id stored in admin_config
  const cfg = await pool.query("select config_value from public.admin_config where config_key='admin_identity' limit 1");
  let adminId = cfg.rows?.[0]?.config_value?.id as string | undefined;

  if (!adminId) {
    const r = await pool.query("select gen_random_uuid() as id");
    adminId = r.rows[0].id;
    await pool.query(
      `insert into public.admin_config(config_key, config_value, updated_at)
       values ($1,$2, now())
       on conflict (config_key) do update set config_value=excluded.config_value, updated_at=now()`,
      ['admin_identity', { id: adminId, email }]
    );
  }

  await pool.query(
    `insert into public.profiles(id, email, role, is_active, created_at, updated_at)
     values ($1,$2,'admin', true, now(), now())
     on conflict (email) do update set role='admin', is_active=true, updated_at=now()`,
    [adminId, email]
  );

  const access = signAccessToken({ sub: adminId, email, role: 'admin' });

  const refreshPlain = randomToken(48);
  const refreshHash = sha256(refreshPlain);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await pool.query(
    `insert into public.refresh_tokens(user_id, token_hash, expires_at) values ($1,$2,$3)`,
    [adminId, refreshHash, expiresAt.toISOString()]
  );

  res.cookie('refresh_token', refreshPlain, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
    expires: expiresAt,
  });

  return res.json({ accessToken: access, user: { id: adminId, email, role: 'admin' } });
}

export async function refresh(req: Request, res: Response) {
  const token = String((req as any).cookies?.refresh_token ?? '');
  if (!token) return res.status(401).json({ error: 'Missing refresh token' });

  const hash = sha256(token);
  const r = await pool.query(
    `select rt.user_id, rt.expires_at, rt.revoked_at, p.email, p.role
     from public.refresh_tokens rt
     join public.profiles p on p.id = rt.user_id
     where rt.token_hash = $1 limit 1`,
    [hash]
  );

  const row = r.rows?.[0];
  if (!row) return res.status(401).json({ error: 'Invalid refresh token' });
  if (row.revoked_at) return res.status(401).json({ error: 'Refresh token revoked' });
  if (new Date(row.expires_at).getTime() < Date.now()) return res.status(401).json({ error: 'Refresh token expired' });

  const access = signAccessToken({ sub: row.user_id, email: row.email, role: row.role });
  return res.json({ accessToken: access, user: { id: row.user_id, email: row.email, role: row.role } });
}

export async function logout(req: Request, res: Response) {
  const token = String((req as any).cookies?.refresh_token ?? '');
  if (token) {
    const hash = sha256(token);
    await pool.query(`update public.refresh_tokens set revoked_at = now() where token_hash = $1`, [hash]);
  }
  res.clearCookie('refresh_token', { path: '/api/auth' });
  return res.json({ ok: true });
}
