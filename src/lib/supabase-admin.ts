import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './supabase-config';
export { isSupabaseConfigured } from './supabase-config';

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'unconfigured-service-role',
  options
);
export function createAuthClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, options);
}
export function isAuthConfigured() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return isSupabaseConfigured() && key.length > 20 && !/placeholder/i.test(key);
}
