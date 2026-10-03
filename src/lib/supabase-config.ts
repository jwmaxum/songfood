export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return /^https?:\/\//.test(url) && !/placeholder|your-supabase/i.test(url) && key.length > 20 && !/placeholder/i.test(key);
}
