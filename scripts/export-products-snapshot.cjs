const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

process.loadEnvFile(path.join(__dirname, '..', '.env.local'));
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase credentials are missing');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const products = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await client.from('products').select('*').order('id').range(start, start + 999);
    if (error) throw error;
    products.push(...data);
    if (data.length < 1000) break;
  }
  const target = path.join(__dirname, '..', 'data', 'products.json');
  fs.writeFileSync(target, `${JSON.stringify(products, null, 2)}\n`);
  console.log(`Exported ${products.length} Supabase products to data/products.json`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
