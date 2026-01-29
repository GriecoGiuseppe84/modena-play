import 'dotenv/config';
import dns from 'node:dns';

// ✅ Forza IPv4-first PRIMA di importare app/routes (che importano pg.ts)
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // ignore
}

// eslint-disable-next-line no-console
console.log('[boot] dns default result order:', (dns as any).getDefaultResultOrder?.() ?? 'unknown');

// Import “ritardato” per garantire che il set DNS sia già attivo
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createApp } = require('./app') as typeof import('./app');

// Log immediato: se questo NON compare nei runtime logs, Render non sta eseguendo node dist/server.js
// eslint-disable-next-line no-console
console.log('[boot] modenaplay-api starting…', {
  node: process.version,
  env: process.env.NODE_ENV,
  hasPORT: Boolean(process.env.PORT),
});

// Non killare il processo per errori non fatali (DB down, ecc.)
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[warn] unhandledRejection', reason);
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

// Health minimale
app.get('/health', (_req: any, res: any) => res.status(200).json({ ok: true }));

const server = app.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`[boot] modenaplay-api listening on 0.0.0.0:${port}`);
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 70_000;
