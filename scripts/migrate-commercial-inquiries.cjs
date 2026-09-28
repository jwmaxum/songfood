const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
const vars = Object.fromEntries(env.split(/\r?\n/).filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line)).map((line) => {
  const index = line.indexOf('=');
  return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')];
}));
const projectRef = new URL(vars.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const query = fs.readFileSync(path.join(root, 'supabase/migrations/20260928_commercial_inquiries.sql'), 'utf8');

async function main() {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${vars.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`Supabase migration failed: HTTP ${response.status} ${await response.text()}`);
  console.log('commercial_inquiries migration applied');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
