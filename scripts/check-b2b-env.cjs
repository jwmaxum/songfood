/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
async function check() {
  const envFile = path.join(__dirname,'..','.env.local');
  if(fs.existsSync(envFile)) process.loadEnvFile(envFile);
  for(const name of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_APP_URL']) {
    if(!process.env[name] || /placeholder|your-supabase|your-anon|your-service/i.test(process.env[name]))
      throw new Error(name + ' is missing or a placeholder');
  }
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
  if(url.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('Application origin requires HTTPS');
  if(process.env.B2B_DEMO_MODE === 'true') throw new Error('Demo transactions are not supported');
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error} = await client.from('b2b_schema_versions').select('id').eq('id','20260929_personal_membership').maybeSingle();
  if(error || !data) throw new Error('B2B-01 migration is not verified');
  const pricing = await client.from('b2b_schema_versions').select('id').eq('id','20260929150000_b2b_pricing').maybeSingle();
  if(pricing.error || !pricing.data) throw new Error('B2B-02 migration is not verified');
  const crm = await client.from('b2b_schema_versions').select('id').eq('id','20261003090000_b2b_crm_quotes').maybeSingle();
  if(crm.error || !crm.data) throw new Error('B2B-04 migration is not verified');
  const pi = await client.from('b2b_schema_versions').select('id').eq('id','20261003150000_b2b_proforma').maybeSingle();
  if(pi.error || !pi.data) throw new Error('B2B-05 migration is not verified');
  const orders = await client.from('b2b_schema_versions').select('id').eq('id','20261003190000_b2b_orders').maybeSingle();
  if(orders.error || !orders.data) throw new Error('B2B-06 migration is not verified');
  const operations = await client.from('b2b_schema_versions').select('id').eq('id','20261003210000_b2b_operations').maybeSingle();
  if(operations.error || !operations.data) throw new Error('B2B-07 migration is not verified');
  console.log('B2B environment and migration marker verified. Email delivery and role/RLS integration still require the acceptance checklist.');
}
if(require.main === module) check().catch(error => { console.error(error.message); process.exitCode=1; });
module.exports={check};
