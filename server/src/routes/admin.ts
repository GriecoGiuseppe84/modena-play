import { Router } from 'express';
import Joi from 'joi';
import { signJwt } from '../lib/jwt';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

const emailSchema = Joi.string().email().required();
const passSchema = Joi.string().min(3).required();

router.post('/login', async (req, res) => {
  const schema = Joi.object({
    email: emailSchema,
    password: passSchema,
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { email, password } = value;

  const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '');

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Missing ADMIN_EMAIL/ADMIN_PASSWORD in env' });
  }

  if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = signJwt({ sub: 'admin', role: 'admin', email }, '7d');

  return res.json({ ok: true, token });
});

// esempio endpoint protetto admin (opzionale)
router.get('/me', requireAuth, (req, res) => {
  if (req.authUser?.kind !== 'admin') return res.status(403).json({ error: 'Admin only' });
  return res.json({ ok: true, auth: req.authUser });
});

export default router;
