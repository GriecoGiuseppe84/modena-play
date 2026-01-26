// server/src/middleware/cors.ts
import cors from 'cors';
import { ENV } from '../config/env';

const DEV_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
]);

function normalizeOrigins(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  return String(v ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

const ALLOWED = new Set(normalizeOrigins(ENV.CORS_ORIGINS));

export const corsMiddleware = cors({
  origin(origin, cb) {
    // server-to-server / curl / healthchecks
    if (!origin) return cb(null, true);

    const o = String(origin).trim();

    const allowedByEnv = ALLOWED.has(o);
    const allowedByDev = ENV.NODE_ENV === 'development' && DEV_ORIGINS.has(o);

    if (allowedByEnv || allowedByDev) return cb(null, true);

    // BLOCCA esplicitamente (così nei log capisci subito)
    return cb(new Error(`CORS blocked for origin: ${o}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
});
