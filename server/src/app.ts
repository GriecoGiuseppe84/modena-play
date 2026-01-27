import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { corsMiddleware } from './middleware/cors';
import { rateLimit } from './middleware/rateLimit';

import authRoutes from './routes/auth';
import publicRoutes from './routes/public';
import adminRoutes from './routes/admin';
import { affiliateRouter } from './routes/affiliate';
import { analyticsRouter } from './routes/analytics';
import { healthInfo } from './controllers/adminController';

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(corsMiddleware);
  app.use(rateLimit);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.get('/', (_req, res) => res.json({ ok: true, name: 'modenaplay-api' }));
  app.get('/api/health', healthInfo);

  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/affiliate', affiliateRouter);
  app.use('/api/analytics', analyticsRouter);

  return app;
}

export default app;
