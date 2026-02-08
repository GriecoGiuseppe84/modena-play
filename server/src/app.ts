import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import pino from 'pino';

import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';

import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import { affiliateRouter } from './routes/affiliate';
import { analyticsRouter } from './routes/analytics';
import healthRoutes from './routes/health';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

export function createApp() {
  const app = express();

  // Render / reverse proxy
  app.set('trust proxy', 1);

  app.use(helmet());

  // ✅ CORS PRIMA DI TUTTO (e soprattutto OPTIONS)
  app.use(corsMiddleware);
  app.options('*', corsMiddleware);

  app.use(rateLimit);

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.get('/', (_req, res) => res.json({ ok: true, name: 'modenaplay-api' }));
  app.use('/api/health', healthRoutes);

  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/affiliate', affiliateRouter);
  app.use('/api/analytics', analyticsRouter);

  app.use(errorHandler);

  return app;
}

export default createApp;
