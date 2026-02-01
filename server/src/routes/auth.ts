import { Router } from 'express';
import Joi from 'joi';
import { supabaseAnon } from '../lib/supabase';
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

  const { data, error: supaErr } = await supabaseAnon.auth.signUp({
    email,
    password,
    options: {
      data: { role },
    },
  });

  if (supaErr) return res.status(400).json({ error: supaErr.message });

  // se Supabase richiede conferma email, session può essere null
  const token = data.session?.access_token ?? null;

  return res.json({
    ok: true,
    user: {
      id: data.user?.id ?? null,
      email: data.user?.email ?? email,
      role,
    },
    token, // può essere null se email confirmation ON
    needsEmailConfirmation: token === null,
  });
});

router.post('/login', async (req, res) => {
  const schema = Joi.object({
    email: emailSchema,
    password: passSchema,
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { email, password } = value;

  const { data, error: supaErr } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });

  if (supaErr) return res.status(401).json({ error: supaErr.message });

  return res.json({
    ok: true,
    user: {
      id: data.user.id,
      email: data.user.email,
      role: (data.user.user_metadata as any)?.role ?? 'user',
    },
    token: data.session.access_token, // ✅ questo è il Bearer che userai dal client
  });
});

// ✅ Recupero password (solo email/password).
// Invia una mail Supabase con link di reset che rimanda al frontend su /reset-password.
router.post('/forgot-password', async (req, res) => {
  const schema = Joi.object({ email: emailSchema });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const redirectTo = computeRedirectTo(req);
  if (!redirectTo) {
    return res.status(500).json({
      error:
        'Missing WEB_URL (or request Origin). Set WEB_URL env on the API service, e.g. https://modenaplay-web.onrender.com',
    });
  }

  const { error: supaErr } = await supabaseAnon.auth.resetPasswordForEmail(value.email, {
    redirectTo,
  });

  if (supaErr) return res.status(400).json({ error: supaErr.message });
  return res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ ok: true, auth: req.authUser });
});

export default router;
