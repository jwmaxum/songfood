const path = require('node:path');
const { spawnSync } = require('node:child_process');

process.loadEnvFile(path.join(__dirname, '..', '.env.local'));
const token = process.env.Cloudflare_API_KEY || process.env.API_Key;
const accountId = process.env.Cloudflare_Account_ID || process.env.Account_ID;
if (!token || !accountId) throw new Error('Cloudflare token or account ID is missing from .env.local');

const branch = process.argv[2] || 'codex-worker-bridge';
const args = [path.join(__dirname, '..', 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
  'pages', 'deploy', 'pages-bridge', '--project-name', 'songfood', '--branch', branch,
  '--commit-dirty=true'];
const result = spawnSync(process.execPath, args, {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId },
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status || 0;
