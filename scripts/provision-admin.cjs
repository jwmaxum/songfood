const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

process.loadEnvFile(path.join(__dirname, '..', '.env.local'));
const email = 'jwmaxum@gmail.com';
const site = 'https://song-food.jwmaxum.workers.dev';
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

async function main() {
  let user;
  for (let page = 1; page <= 10 && !user; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    user = data.users.find((item) => item.email?.toLowerCase() === email);
    if (data.users.length < 1000) break;
  }
  let invited = false;
  if (!user) {
    const { data, error } = await client.auth.admin.inviteUserByEmail(email, { redirectTo: `${site}/admin/account` });
    if (error || !data.user) throw error || new Error('Supabase did not return the invited user');
    user = data.user;
    invited = true;
  }
  const { error: profileError } = await client.from('user_profiles').upsert({
    id: user.id, email, name: '관리자', role: 'admin', status: 'active', updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (profileError) throw profileError;
  console.log(invited ? `Admin invitation sent to ${email}; active profile created` : `Existing ${email} account has an active admin profile`);
}

main().catch((error) => { console.error(`Admin provisioning failed: ${error.message}`); process.exitCode = 1; });
