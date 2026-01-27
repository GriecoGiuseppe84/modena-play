import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function must(v: string, name: string) {
  if (!v) {
    throw new Error(
      `${name} is required. Set it in Render env vars. ` +
        (name === 'SUPABASE_URL'
          ? 'Example: https://<project-ref>.supabase.co'
          : name.includes('SERVICE')
            ? 'Use the Service Role key (Project Settings → API → service_role).'
            : 'Use the anon public key (Project Settings → API → anon public).')
    );
  }
  return v;
}

export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
  const serviceKey =
    String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();

  return createClient(must(supabaseUrl, 'SUPABASE_URL'), must(serviceKey, 'SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

export function getAnonKey(): string {
  const anonKey = String(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY_PUBLIC || '').trim();
  return must(anonKey, 'SUPABASE_ANON_KEY');
}
