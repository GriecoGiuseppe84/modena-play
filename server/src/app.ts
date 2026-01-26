import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { corsMiddleware } from './middleware/cors';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { affiliateRouter } from './routes/affiliate';
import { analyticsRouter } from './routes/analytics';
import { logger } from './utils/logger';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(rateLimitMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.info('http', { msg: msg.trim() }) },
    })
  );

  app.get('/', (_req, res) => res.json({ ok: true, name: 'modenaplay-api' }));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/affiliate', affiliateRouter);
  app.use('/api/analytics', analyticsRouter);

  app.use(errorHandler);
  return app;
}
