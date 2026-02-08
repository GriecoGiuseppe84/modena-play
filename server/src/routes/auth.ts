import { Router } from 'express';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { pool } from '../database/pg';
import { signJwt } from '../lib/jwt';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

const emailSchema = Joi.string().email().required();
const passSchema = Joi.string().min(6).required();
const roleSchema = Joi.string().valid('user', 'seller').default('user');

function normalizeOrigin(v: string) {
  return v.trim().replace(/\/$/, '');
}

function computeRedirectTo(req: any): string | null {
  const explicit = String(process.env.WEB_URL || process.env.PUBLIC_WEB_URL || '').trim();
  const origin = String(req.headers?.origin || '').trim();
  const base = explicit || origin;
  if (!base) return null;
  return `${normalizeOrigin(base)}/reset-password`;
}

router.post('/register', async (req, res) => {
  const schema = Joi.object({
    email: emailSchema,
    password: passSchema,
    role: roleSchema,
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { email, password, role } = value;

  // local DB user
  const emailNorm = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // ensure table exists (wizard also does this, but keep it robust)
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        role text NOT NULL DEFAULT 'user',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const ins = await pool.query(
      `INSERT INTO app_users (email, password_hash, role)
       VALUES ($1,$2,$3)
       RETURNING id, email, role`,
      [emailNorm, passwordHash, role]
    );

    const u = ins.rows?.[0];
    const token = signJwt({ sub: u.id, role: (u.role === 'seller' ? 'seller' : 'user') as any, email: u.email }, '7d');
    return res.json({
      ok: true,
      user: { id: u.id, email: u.email, role: u.role === 'seller' ? 'seller' : 'user' },
      token,
      needsEmailConfirmation: false,
    });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return res.status(500).json({ error: msg });
  }
});

router.post('/login', async (req, res) => {
  const schema = Joi.object({
    email: emailSchema,
    password: passSchema,
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { email, password } = value;

  const emailNorm = email.trim().toLowerCase();
  try {
    const r = await pool.query(
      `SELECT id, email, role, password_hash, is_active
       FROM app_users
       WHERE email = $1
       LIMIT 1`,
      [emailNorm]
    );

    const u = r.rows?.[0];
    if (!u || !u.is_active) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const roleOut = u.role === 'seller' ? 'seller' : 'user';
    const token = signJwt({ sub: u.id, role: roleOut as any, email: u.email }, '7d');

    return res.json({
      ok: true,
      user: { id: u.id, email: u.email, role: roleOut },
      token,
    });
  } catch (e: any) {
    const msg = String(e?.message || e);
    // likely missing table (setup not run yet)
    if (msg.toLowerCase().includes('app_users')) {
      return res.status(503).json({ error: 'DB not initialized yet. Run Admin → Setup Wizard → Step 2 (Create tables).' });
    }
    return res.status(500).json({ error: msg });
  }
});

// ✅ Recupero password (solo email/password).
// Invia una mail Supabase con link di reset che rimanda al frontend su /reset-password.
router.post('/forgot-password', async (req, res) => {
  const schema = Joi.object({ email: emailSchema });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  // Local auth MVP does not implement email reset yet.
  // (We can add SMTP-based reset flow later.)
  const redirectTo = computeRedirectTo(req);
  return res.status(501).json({
    error:
      'Password reset not configured in local-auth mode. Contact admin or enable an email reset flow.\n' +
      (redirectTo ? `Suggested frontend route: ${redirectTo}` : 'Set WEB_URL to enable proper links.'),
  });
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ ok: true, auth: req.authUser });
});

export default router;
