import { createClient } from '@supabase/supabase-js';

const url = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured) {
  // Avoid throwing at import time in production builds; show UI errors instead.
  // eslint-disable-next-line no-console
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = isSupabaseConfigured ? createClient(url, key) : (null as any);
