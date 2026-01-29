import pg from 'pg';
const { Pool } = pg;

/**
 * Postgres pool for Supabase/Render.
 * - In production we force SSL with rejectUnauthorized=false (common on managed Postgres).
 * - We set connectionTimeoutMillis so we fail fast instead of hanging the request.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  // Fail-fast (important on Render free tiers / misconfig)
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 6000),
  // keep pool stable
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30000),
  keepAlive: true,
});

export async function pgNow() {
  const r = await pool.query('select now() as now');
  return r.rows?.[0]?.now;
}

/**
 * Helper: run a promise with a hard timeout (so the route can return 504).
 */
export async function withTimeout<T>(p: Promise<T>, ms: number, onTimeoutMsg = 'Timeout'): Promise<T> {
  let t: any;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(onTimeoutMsg)), ms);
  });
  try {
    return await Promise.race([p, timeout]) as T;
  } finally {
    clearTimeout(t);
  }
}

export function isDatabaseConfigured() {
  return Boolean(String(process.env.DATABASE_URL || '').trim());
}

export function safeDbInfo() {
  // Never leak password. Extract host/port/db/user for debugging.
  try {
    const v = String(process.env.DATABASE_URL || '').trim();
    if (!v) return { configured: false as const };
    const u = new URL(v);
    return {
      configured: true as const,
      host: u.hostname,
      port: u.port || '5432',
      database: u.pathname?.replace(/^\//, '') || '',
      user: decodeURIComponent(u.username || ''),
      ssl: process.env.NODE_ENV === 'production' ? true : false,
    };
  } catch {
    return { configured: true as const, parseError: true as const };
  }
}
