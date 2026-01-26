import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = Number(err?.status ?? 500);
  const message = status >= 500 ? 'Internal Server Error' : String(err?.message ?? 'Request error');

  logger.error('request_error', {
    status,
    message: String(err?.message ?? err),
    path: req.path,
    method: req.method,
  });

  res.status(status).json({ error: message });
}
