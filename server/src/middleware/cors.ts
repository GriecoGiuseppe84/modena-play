import cors from 'cors';

const DEFAULT_ALLOWED = new Set<string>([
  'https://modenaplay-web.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
]);

function normalizeOrigin(o: string) {
  return o.trim().replace(/\/$/, '');
}

function parseOrigins(v?: string): Set<string> {
  const out = new Set<string>();
  if (!v) return out;
  for (const s of v.split(',')) {
    const x = s.trim();
    if (x) out.add(normalizeOrigin(x));
  }
  return out;
}

const envOrigins = parseOrigins(process.env.CORS_ORIGINS);

export const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    const o = normalizeOrigin(origin);
    const allowed =
      envOrigins.has(o) || DEFAULT_ALLOWED.has(o) || o.endsWith('.onrender.com');
    return cb(null, allowed);
  },
  credentials: false, // ✅ JWT header, niente cookie
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // ✅ fondamentale
  optionsSuccessStatus: 204,
});
