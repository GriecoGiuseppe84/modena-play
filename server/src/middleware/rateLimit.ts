import rateLimit from 'express-rate-limit';
import { SECURITY } from '../config/security';

export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000,
  limit: SECURITY.RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
});
