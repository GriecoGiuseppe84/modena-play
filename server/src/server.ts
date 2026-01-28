import 'dotenv/config';
import { createApp } from './app';

// Log immediato: se questo NON compare nei runtime logs, Render non sta eseguendo node dist/server.js
// eslint-disable-next-line no-console
console.log('[boot] modenaplay-api starting…', {
  node: process.version,
  env: process.env.NODE_ENV,
  hasPORT: Boolean(process.env.PORT),
});

// Log di crash che altrimenti “spariscono”
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[fatal] unhandledRejection', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[fatal] uncaughtException', err);
  process.exit(1);
});

const port = Number(process.env.PORT ?? 10000);
const app = createApp();

// Render / reverse proxy
app.set('trust proxy', 1);

// Health minimale (se non l’hai già altrove)
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

const server = app.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`[boot] modenaplay-api listening on 0.0.0.0:${port}`);
});

// (Opzionale ma utile in prod)
server.keepAliveTimeout = 65_000;
server.headersTimeout = 70_000;
