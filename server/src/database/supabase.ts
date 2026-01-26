import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ENV } from '../config/env';

export const supabaseAdmin: SupabaseClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const supabaseAnon: SupabaseClient = ENV.SUPABASE_ANON_KEY
  ? createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : supabaseAdmin;
