import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import pino from 'pino';

import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';

import authRoutes from './routes/auth';
import publicRoutes from './routes/public';
import adminRoutes from './routes/admin';
import { affiliateRouter } from './routes/affiliate';
import { analyticsRouter } from './routes/analytics';
import healthRoutes from './routes/health';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

export function createApp() {
  const app = express();

  // Render / reverse proxies
  app.set('trust proxy', 1);

  // 🔐 Security headers
  app.use(helmet());

  // 🌍 CORS — PRIMA DI TUTTO
  app.use(corsMiddleware);
  app.options('*', corsMiddleware as any);

  // 🛡 Rate limit
  app.use(rateLimit);

  // 📦 Body / cookies / logs
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  // 🩺 Base
  app.get('/', (_req, res) =>
    res.json({ ok: true, name: 'modenaplay-api' })
  );

  app.use('/api/health', healthRoutes);

  // 🔐 API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/affiliate', affiliateRouter);
  app.use('/api/analytics', analyticsRouter);

  // ❌ Error handler (sempre ultimo)
  app.use(errorHandler);

  return app;
}

export default createApp;
