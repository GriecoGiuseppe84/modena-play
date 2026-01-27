import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../database/pg';
import { getSupabaseAdmin, getAnonKey } from '../database/supabase';
import { randomToken, sha256 } from '../utils/crypto';

type Role = 'user' | 'seller';

function signAccessToken(payload: { sub: string; email: string; role: any }) {
  const secret = process.env.JWT_SECRET || '';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

function getSupabaseAuthBase(): string {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  if (!url) throw new Error('Missing SUPABASE_URL');
  return `${url}/auth/v1`;
}


async function supabaseSignUp(email: string, password: string) {
  const base = getSupabaseAuthBase();
  const anon = getAnonKey();

  const res = await fetch(`${base}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
    body: JSON.stringify({ email, password }),
  });

  const txt = await res.text();
  const data = txt ? (() => { try { return JSON.parse(txt); } catch { return { error: txt }; } })() : {};
  if (!res.ok) throw new Error((data as any)?.msg || (data as any)?.error_description || (data as any)?.error || `HTTP ${res.status}`);
  return data as any;
}

async function supabasePasswordToken(email: string, password: string) {
  const base = getSupabaseAuthBase();
  const anon = getAnonKey();

  const res = await fetch(`${base}/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
    body: JSON.stringify({ email, password }),
  });

  const txt = await res.text();
  const data = txt ? (() => { try { return JSON.parse(txt); } catch { return { error: txt }; } })() : {};
  if (!res.ok) throw new Error((data as any)?.error_description || (data as any)?.error || `HTTP ${res.status}`);
  return data as any;
}

async function upsertProfile(id: string, email: string, role: Role) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert({ id, email, role, is_active: true }, { onConflict: 'email' });

  if (error) throw new Error(error.message);
}

async function issueTokens(res: Response, userId: string, email: string, role: string) {
  const access = signAccessToken({ sub: userId, email, role });

  const refreshPlain = randomToken(48);
  const refreshHash = sha256(refreshPlain);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await pool.query(
    `insert into public.refresh_tokens(user_id, token_hash, expires_at) values ($1,$2,$3)`,
    [userId, refreshHash, expiresAt.toISOString()]
  );

  res.cookie('refresh_token', refreshPlain, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
    expires: expiresAt,
  });

  return { accessToken: access, user: { id: userId, email, role } };
}

export async function signup(req: Request, res: Response) {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const role = (String(req.body?.role ?? 'user') as Role);

  if (!email || !password) return res.status(400).json({ error: 'Missing email/password' });
  if (role !== 'user' && role !== 'seller') return res.status(400).json({ error: 'Invalid role' });
  if (password.length < 6) return res.status(400).json({ error: 'Password too short' });

  const su = await supabaseSignUp(email, password);

  let userId = String(su?.user?.id ?? '');
  if (!userId) {
    const { data, error } = await getSupabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(error.message);
    const found = data?.users?.find(u => (u.email || '').toLowerCase() === email);
    if (!found?.id) throw new Error('User created but cannot resolve id (check email confirmations)');
    userId = found.id;
  }

  await upsertProfile(userId, email, role);
  const tokens = await issueTokens(res, userId, email, role);
  return res.status(201).json(tokens);
}

export async function login(req: Request, res: Response) {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!email || !password) return res.status(400).json({ error: 'Missing email/password' });

  const tok = await supabasePasswordToken(email, password);
  const userId = String(tok?.user?.id ?? '');
  if (!userId) return res.status(401).json({ error: 'Invalid credentials' });

  const pr = await pool.query(`select role from public.profiles where id = $1 limit 1`, [userId]);
  const role = pr.rows?.[0]?.role ?? 'user';

  const tokens = await issueTokens(res, userId, email, role);
  return res.json(tokens);
}
