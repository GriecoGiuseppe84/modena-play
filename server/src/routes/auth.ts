import { Router } from 'express';
import Joi from 'joi';
import { supabaseAnon } from '../lib/supabase';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

const emailSchema = Joi.string().email().required();
const passSchema = Joi.string().min(6).required();

router.post('/register', async (req, res) => {
  const schema = Joi.object({
    email: emailSchema,
    password: passSchema,
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { email, password } = value;

  const { data, error: supaErr } = await supabaseAnon.auth.signUp({
    email,
    password,
  });

  if (supaErr) return res.status(400).json({ error: supaErr.message });

  // se Supabase richiede conferma email, session può essere null
  const token = data.session?.access_token ?? null;

  return res.json({
    ok: true,
    user: { id: data.user?.id ?? null, email: data.user?.email ?? email },
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
    user: { id: data.user.id, email: data.user.email },
    token: data.session.access_token, // ✅ questo è il Bearer che userai dal client
  });
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ ok: true, auth: req.authUser });
});

export default router;
