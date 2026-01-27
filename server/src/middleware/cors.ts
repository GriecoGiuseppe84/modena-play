import cors from 'cors';

function parseOrigins(v: string | undefined): string[] {
  return String(v ?? '').split(',').map(s => s.trim()).filter(Boolean);
}

export const corsMiddleware = cors({
  origin: (origin, cb) => {
    const allowed = new Set(parseOrigins(process.env.CORS_ORIGINS));
    if (!origin) return cb(null, true);
    if (allowed.has(origin)) return cb(null, true);
    return cb(new Error('CORS not allowed'));
  },
  credentials: true,
});
