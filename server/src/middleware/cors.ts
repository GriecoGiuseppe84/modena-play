import type { Request, Response, NextFunction } from 'express';

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
  // Always allow our own domains + Render preview for MVP
  try {
    const u = new URL(origin);
    const h = u.hostname.toLowerCase();
    if (h === 'modenaplay.com' || h === 'www.modenaplay.com') return true;
    if (h === 'modenagiochi.com' || h === 'www.modenagiochi.com') return true;
    if (isOnRender(origin)) return true;
    if (isLocalhost(origin)) return true;
  } catch {}
  return false;
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin ? normalizeOrigin(String(req.headers.origin)) : '';

  const configured = parseOrigins(process.env.CORS_ORIGINS);
  const allowed =
    !!origin &&
    (configured.includes(origin) || defaultAllow(origin));

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    );
  }

  if (req.method === 'OPTIONS') {
    // Always end preflight (even if not allowed), to avoid browser showing "failed to fetch"
    return res.status(204).end();
  }

  return next();
}
