/*
 * Env helper: keep the API bootable even if some optional vars are missing.
 * Only the Supabase public configuration is truly required for the auth MVP.
 */

function required(key: string): string {
  const v = String(process.env[key] ?? '').trim();
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

function optional(key: string, fallback = ''): string {
  const v = String(process.env[key] ?? '').trim();
  return v || fallback;
}

function parseCorsOrigins(raw: string): string[] {
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(list));
}

export const ENV = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: Number(optional('PORT', '10000')),

  DATABASE_URL: optional('DATABASE_URL', ''),

  // ✅ required for auth routes
  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_ANON_KEY: required('SUPABASE_ANON_KEY'),

  // ✅ optional (recommended for DB ops / bypass RLS)
  SUPABASE_SERVICE_ROLE_KEY: optional('SUPABASE_SERVICE_ROLE_KEY') || optional('SUPABASE_SERVICE_KEY'),

  // ✅ optional admin bootstrap
  ADMIN_EMAIL: optional('ADMIN_EMAIL'),
  ADMIN_PASSWORD: optional('ADMIN_PASSWORD'),

  JWT_SECRET: optional('JWT_SECRET', 'dev_secret_change_me'),

  // Password recovery redirect base URL (fallback to request Origin)
  WEB_URL: optional('WEB_URL') || optional('PUBLIC_WEB_URL'),

  CORS_ORIGINS: parseCorsOrigins(optional('CORS_ORIGINS', '')),
  RATE_LIMIT_PER_MIN: Number(optional('RATE_LIMIT_PER_MIN', '100')),
};
