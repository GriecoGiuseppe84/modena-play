import dotenv from 'dotenv';

dotenv.config();

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const IS_PROD = NODE_ENV === 'production';

export const ENV = {
  NODE_ENV,
  IS_PROD,
  PORT: Number(process.env.PORT ?? 10000),

  SUPABASE_URL: req('SUPABASE_URL'),
  SUPABASE_SERVICE_KEY: req('SUPABASE_SERVICE_KEY'),
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',

  ADMIN_EMAIL: req('ADMIN_EMAIL').trim().toLowerCase(),
  ADMIN_PASSWORD: req('ADMIN_PASSWORD'),

  JWT_SECRET: req('JWT_SECRET'),
  JWT_ISSUER: process.env.JWT_ISSUER ?? 'modenaplay-api',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE ?? 'modenaplay-platform',

  CORS_ORIGINS: (process.env.CORS_ORIGINS ??
    'http://localhost:5173,http://localhost:5174,http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN?.trim() || undefined,
};
