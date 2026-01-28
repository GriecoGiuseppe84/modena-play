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

function defaultAllow(origin: string) {
  try {
    const u = new URL(origin);
    const h = u.hostname.toLowerCase();
    if (h === 'modenaplay.com' || h === 'www.modenaplay.com') return true;
    if (h === 'modenagiochi.com' || h === 'www.modenagiochi.com') return true;
    if (isOnRender(origin)) return true; // MVP: allow Render frontend previews
    if (isLocalhost(origin)) return true;
  } catch {}
  return false;
}

export const corsMiddleware = cors({
  origin(origin, cb) {
    // allow server-to-server, curl, Postman (no Origin header)
    if (!origin) return cb(null, true);

    const o = normalizeOrigin(origin);
    const configured = parseOrigins(process.env.CORS_ORIGINS);

    const allowed = configured.includes(o) || defaultAllow(o);
    return cb(null, allowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
});
