import cors from 'cors';
import { ENV } from '../config/env';

const DEV_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
]);

export const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);

    const allowedByEnv =
      Array.isArray(ENV.CORS_ORIGINS) && ENV.CORS_ORIGINS.includes(origin);
    const allowedByDev =
      ENV.NODE_ENV === 'development' && DEV_ORIGINS.has(origin);

    return cb(null, allowedByEnv || allowedByDev);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
