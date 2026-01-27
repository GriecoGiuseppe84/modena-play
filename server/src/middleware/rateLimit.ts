import type { Request, Response, NextFunction } from 'express';

type Bucket = { n: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const perMin = Math.max(1, Number(process.env.RATE_LIMIT_PER_MIN ?? 100));
  const key = String(req.headers['x-forwarded-for'] ?? req.ip ?? 'unknown').split(',')[0].trim();
  const now = Date.now();

  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { n: 1, resetAt: now + 60_000 });
    return next();
  }

  b.n += 1;
  if (b.n > perMin) return res.status(429).json({ error: 'Rate limit exceeded' });
  return next();
}
