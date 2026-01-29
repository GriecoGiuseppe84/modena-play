import dns from 'node:dns';
import pg from 'pg';
const { Pool } = pg;

// ✅ Prefer IPv4 when DNS returns both A and AAAA (Render spesso non ha IPv6 egress affidabile)
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // ignore
}

export type DbHint = {
  present: boolean;
  configured: boolean;
  scheme: string | null;
  host?: string;
  message: string;
  hints: string[];
};

function readDatabaseUrl(): string {
  return String(process.env.DATABASE_URL ?? '').trim();
}

// ✅ Some files import this name
export function isDatabaseConfigured(): boolean {
  const raw = readDatabaseUrl();
  return raw.startsWith('postgres://') || raw.startsWith('postgresql://');
}

// ✅ Some files import this name
export function safeDbInfo(): DbHint {
  const raw = readDatabaseUrl();
  const hints: string[] = [];

  if (!raw) {
    hints.push('DATABASE_URL mancante su Render (service "modenaplay-api").');
    hints.push('Deve essere una URI Postgres (postgresql://...), NON https://<project>.supabase.co');
    return {
      present: false,
      configured: false,
      scheme: null,
      message: 'DATABASE_URL missing',
      hints,
    };
  }

  const scheme = raw.split(':')[0]?.toLowerCase() || null;

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    hints.push('DATABASE_URL sembra un URL HTTP. Deve iniziare con postgresql:// o postgres://');
  }
  if (!isDatabaseConfigured()) {
    hints.push(
      'Formato atteso: postgresql://postgres:<PWD>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require'
    );
  }

  let host: string | undefined;
  try {
    host = new URL(raw).hostname || undefined;
  } catch {
    // ignore
  }

  return {
    present: true,
    configured: isDatabaseConfigured(),
    scheme,
    host,
    message: isDatabaseConfigured() ? 'DATABASE_URL looks OK' : 'DATABASE_URL looks invalid',
    hints,
  };
}

// ✅ healthController importa questo nome
export const databaseConfigHint = safeDbInfo;

export const pool = new Pool({
  connectionString: readDatabaseUrl() || undefined,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 5000),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 10000),
  max: Number(process.env.PG_POOL_MAX ?? 10),
});

// ✅ evita crash del processo su errori rete/idle clients
pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[pg] pool error (handled):', err?.message || err);
});

export function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  onTimeoutMsg = `timeout of ${ms}ms exceeded`
): Promise<T> {
  let t: NodeJS.Timeout;
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error(onTimeoutMsg)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t!)) as Promise<T>;
}

export async function pgPing(timeoutMs = 6000): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL not configured (must start with postgresql:// or postgres://)');
  }
  const r = await withTimeout(
    pool.query('select 1 as ok'),
    timeoutMs,
    'Connection terminated due to connection timeout'
  );
  return r.rows?.[0]?.ok === 1;
}

export async function pgNow() {
  const r = await pool.query('select now() as now');
  return r.rows?.[0]?.now;
}
