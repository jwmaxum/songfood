import { createClient } from '@supabase/supabase-js';
export { isSupabaseConfigured } from './supabase-config';

// Browser client only. Privileged credentials must never be imported here.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);
