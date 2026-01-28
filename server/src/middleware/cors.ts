import cors from 'cors';

function normalizeOrigin(o: string) {
  return o.trim().replace(/\/$/, '');
}

function parseOrigins(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

function isOnRender(origin: string) {
  try {
    const u = new URL(origin);
    return u.hostname.endsWith('.onrender.com');
  } catch {
    return false;
  }
}

function isLocalhost(origin: string) {
  return /^https?:\/\/localhost(:\d+)?$/.test(origin);
}

const configured = parseOrigins(process.env.CORS_ORIGINS);

export const corsMiddleware = cors({
  origin(origin, cb) {
    // richieste server-to-server o tool (no Origin)
    if (!origin) return cb(null, true);

    const o = normalizeOrigin(origin);

    const allowed =
      configured.includes(o) ||
      isOnRender(o) ||
      isLocalhost(o) ||
      o === 'https://modenaplay-web.onrender.com';

    // se NON allowed → blocca esplicitamente
    return cb(allowed ? null : new Error('CORS blocked'), allowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
});
