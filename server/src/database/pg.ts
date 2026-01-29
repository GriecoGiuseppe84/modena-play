import pg from 'pg';
const { Pool } = pg;

function readDatabaseUrl() {
  return String(process.env.DATABASE_URL || '').trim();
}

/**
 * Pool Postgres usata per le query applicative.
 *
 * Importante:
 * - Se DATABASE_URL non è settata, NON vogliamo “impiccare” le richieste.
 *   Le route che dipendono dal DB devono fare un check esplicito e rispondere
 *   con un errore chiaro.
 * - Impostiamo connectionTimeoutMillis per evitare che un tentativo di connessione
 *   rimanga appeso a lungo (il client front-end di default ha timeout 8s).
 */
export const pool = new Pool({
  ...(readDatabaseUrl() ? { connectionString: readDatabaseUrl() } : {}),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: Math.max(1, Number(process.env.PG_POOL_MAX ?? 5)),
  idleTimeoutMillis: Math.max(1_000, Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30_000)),
  connectionTimeoutMillis: Math.max(1_000, Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 5_000)),
});

export function isDatabaseConfigured() {
  return Boolean(readDatabaseUrl());
}

export function databaseConfigHint() {
  return (
    'DATABASE_URL mancante o vuota.\n' +
    'Su Render → service "modenaplay-api" → Environment, imposta DATABASE_URL con la connection string PostgreSQL.\n' +
    'Se usi Supabase: Project Settings → Database → Connection string (URI).'
  );
}

export async function pgNow() {
  const r = await pool.query('select now() as now');
  return r.rows?.[0]?.now;
}
