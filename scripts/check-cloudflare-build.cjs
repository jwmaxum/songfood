function checkCloudflareBuild(env = process.env) {
  let app, supabase;
  try { app = new URL(env.NEXT_PUBLIC_APP_URL); } catch { throw new Error('NEXT_PUBLIC_APP_URL must be the production HTTPS origin in Cloudflare Build variables.'); }
  if (app.protocol !== 'https:' || app.username || app.password || app.pathname !== '/' || app.search || app.hash || (['localhost','[::1]'].includes(app.hostname) || app.hostname.startsWith('127.')) || app.hostname.endsWith('.local'))
    throw new Error('NEXT_PUBLIC_APP_URL must be a public HTTPS origin without a path.');
  try { supabase = new URL(env.NEXT_PUBLIC_SUPABASE_URL); } catch { throw new Error('NEXT_PUBLIC_SUPABASE_URL is required in Cloudflare Build variables.'); }
  if (supabase.protocol !== 'https:' || supabase.username || supabase.password || /placeholder|your-/i.test(supabase.hostname))
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be the configured HTTPS Supabase URL.');
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let anon = false;
  try { anon = JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64url').toString()).role === 'anon'; } catch { /* Publishable keys are not JWTs. */ }
  if (!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key) && !(key.split('.').length === 3 && anon))
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY must be a publishable or legacy anon key, never a server secret.');
}
if (require.main === module) {
  try { checkCloudflareBuild(); console.log('Cloudflare production build variables verified (values omitted).'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { checkCloudflareBuild };
