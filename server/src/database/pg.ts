import dns from 'node:dns';
import pg from 'pg';
const { Pool } = pg;

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // ignore
}

export function isDatabaseConfigured(): boolean {
  const raw = String(process.env.DATABASE_URL ?? '').trim();
  return raw.startsWith('postgres://') || raw.startsWith('postgresql://');
}

export function safeDbInfo() {
  const raw = String(process.env.DATABASE_URL ?? '').trim();
  const hints: string[] = [];

  if (!raw) {
    hints.push('DATABASE_URL mancante su Render (service modenaplay-api).');
    hints.push('Deve essere una URI Postgres: postgresql://... NON https://...supabase.co');
    return { present: false, configured: false, hints };
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    hints.push('DATABASE_URL è un URL HTTP. Deve iniziare con postgresql:// o postgres://');
  }
  if (!isDatabaseConfigured()) {
    hints.push('Formato atteso: postgresql://postgres:<PWD>@db.<ref>.supabase.co:5432/postgres?sslmode=require');
  }
  return { present: true, configured: isDatabaseConfigured(), hints };
}

export const pool = new Pool({
  connectionString: String(process.env.DATABASE_URL ?? '') || undefined,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 5000),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 10000),
  max: Number(process.env.PG_POOL_MAX ?? 10),
});

// ✅ evita crash del processo quando la pool emette error (rete/ipv6/idle client)
pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[pg] pool error (handled):', err?.message || err);
});

export async function pgNow() {
  const r = await pool.query('select now() as now');
  return r.rows?.[0]?.now;
}
