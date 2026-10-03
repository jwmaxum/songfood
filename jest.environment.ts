// Unit tests must not inherit deployment origins or live service credentials.
// Tests exercising configuration explicitly provide fixture values themselves.
for (const key of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'TOSS_SECRET_KEY', 'TRUST_CLOUDFLARE_IP']) {
  delete process.env[key];
}