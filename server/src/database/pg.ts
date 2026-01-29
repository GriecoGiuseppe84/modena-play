import pg from 'pg';
const { Pool } = pg;

export type DatabaseConfigHint = {
  ok: boolean;
  present: boolean;
  scheme: string | null;
  host?: string;
  message: string;
  hints: string[];
};

export function databaseConfigHint(): DatabaseConfigHint {
  const raw = String(process.env.DATABASE_URL ?? '').trim();
  const hints: string[] = [];

  if (!raw) {
    hints.push('DATABASE_URL mancante nel service "modenaplay-api" su Render.');
    hints.push('Deve essere una URI Postgres (postgresql://...), NON https://<project>.supabase.co');
    return {
      ok: false,
      present: false,
      scheme: null,
      message: 'DATABASE_URL missing',
      hints,
    };
  }

  const scheme = raw.split(':')[0]?.toLowerCase() || null;
  const looksPg = raw.startsWith('postgres://') || raw.startsWith('postgresql://');

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    hints.push('DATABASE_URL sembra un URL HTTP. Deve iniziare con postgresql:// o postgres://');
  }
  if (!looksPg) {
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
    ok: looksPg,
    present: true,
    scheme,
    host,
    message: looksPg ? 'DATABASE_URL looks OK' : 'DATABASE_URL looks invalid',
    hints,
  };
}

function makePool() {
  const raw = String(process.env.DATABASE_URL ?? '').trim();

  return new Pool({
    connectionString: raw || undefined,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 5000),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 10000),
    max: Number(process.env.PG_POOL_MAX ?? 10),
  });
}

export const pool = makePool();

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

export async function pgNow() {
  const r = await pool.query('select now() as now');
  return r.rows?.[0]?.now;
}

export async function pgPing(timeoutMs = 5000) {
  const r = await withTimeout(pool.query('select 1 as ok'), timeoutMs, 'Connection terminated due to connection timeout');
  return r.rows?.[0]?.ok === 1;
}
