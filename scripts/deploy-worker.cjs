const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

process.loadEnvFile(path.join(__dirname, '..', '.env.local'));
const cloudflareToken = process.env.Cloudflare_API_KEY || process.env.API_Key;
const cloudflareAccountId = process.env.Cloudflare_Account_ID || process.env.Account_ID;
if (!cloudflareToken || !cloudflareAccountId) throw new Error('Cloudflare token or account ID is missing from .env.local');
const required = ['SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
for (const key of required) if (!process.env[key]) throw new Error(`${key} is missing from .env.local`);

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'song-food-worker-'));
const secretsFile = path.join(tempDirectory, 'secrets.json');
fs.writeFileSync(secretsFile, JSON.stringify({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}), { mode: 0o600 });

try {
  const result = spawnSync(process.execPath, [path.join(__dirname, '..', 'node_modules', 'wrangler', 'bin', 'wrangler.js'), 'deploy', '--autoconfig=false', '--secrets-file', secretsFile], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, CLOUDFLARE_API_TOKEN: cloudflareToken, CLOUDFLARE_ACCOUNT_ID: cloudflareAccountId },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  process.exitCode = result.status || 0;
} finally {
  fs.unlinkSync(secretsFile);
  fs.rmdirSync(tempDirectory);
}
