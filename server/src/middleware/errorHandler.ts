import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = Number(err?.status || 500);
  const msg = String(err?.message || 'Internal Server Error');
  if (!res.headersSent) {
    res.status(status).json({ error: msg });
  }
}
