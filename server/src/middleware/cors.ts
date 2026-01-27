import cors from 'cors';

function parseOrigins(v: string | undefined): string[] {
  return String(v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string, allowed: Set<string>) {
  if (allowed.has(origin)) return true;

  // allow Render preview domains explicitly if you want:
  // https://<service>.onrender.com
  try {
    const u = new URL(origin);
    if (u.hostname.endsWith('.onrender.com')) return true;
  } catch {
    // ignore
  }

  return false;
}

export const corsMiddleware = cors({
  origin: (origin, cb) => {
    const allowed = new Set<string>(parseOrigins(process.env.CORS_ORIGINS));

    // same-origin / server-to-server / curl
    if (!origin) return cb(null, true);

    if (isAllowedOrigin(origin, allowed)) return cb(null, true);

    // IMPORTANT: do not throw an Error (it prevents CORS headers and looks like a network error in browser)
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
});
