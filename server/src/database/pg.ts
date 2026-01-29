import { Pool } from 'pg';

type SafeDbInfo = {
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

// ✅ Required by your existing imports
export function isDatabaseConfigured(): boolean {
  const raw = readDatabaseUrl();
  return raw.startsWith('postgres://') || raw.startsWith('postgresql://');
}

// ✅ Required by your existing imports
export function safeDbInfo(): SafeDbInfo {
  const raw = readDatabaseUrl();
  const hints: string[] = [];

  if (!raw) {
    hints.push('DATABASE_URL mancante nel service "modenaplay-api" su Render.');
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
  const ok = isDatabaseConfigured();

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    hints.push('DATABASE_URL sembra un URL HTTP. Deve iniziare con postgresql:// o postgres://');
  }
  if (!ok) {
    hints.push(
      'Formato atteso (esempio): postgresql://postgres:<PASSWORD>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require'
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
    configured: ok,
    scheme,
    host,
    message: ok ? 'DATABASE_URL looks OK' : 'DATABASE_URL looks invalid',
    hints,
  };
}

// Compat export (se altri file la usano)
export const databaseConfigHint = safeDbInfo;

// -------- Pool + helpers --------

export const pool = new Pool({
  connectionString: readDatabaseUrl() || undefined,
  // Supabase Postgres richiede SSL in produzione
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 5000),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 10000),
  max: Number(process.env.PG_POOL_MAX ?? 10),
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

export async function pgPing(timeoutMs = 5000): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not configured (must start with postgresql:// or postgres://)');
  }
  const r = await withTimeout(
    pool.query('select 1 as ok'),
    timeoutMs,
    'Connection terminated due to connection timeout'
  );
  return r.rows?.[0]?.ok === 1;
}

export async function pgNow(): Promise<any> {
  const r = await pool.query('select now() as now');
  return r.rows?.[0]?.now;
}
