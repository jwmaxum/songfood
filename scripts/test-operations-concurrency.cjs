/* eslint-disable @typescript-eslint/no-require-imports */
// Explicit integration test: creates an isolated, non-exposed schema, tests concurrent RPCs, then drops only that schema.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
async function run(){
 if(!process.argv.includes('--allow-sandbox-schema'))throw Error('Pass --allow-sandbox-schema to authorize a temporary isolated database schema.');
 const token=process.env.SUPABASE_ACCESS_TOKEN,ref=process.env.SUPABASE_PROJECT_REF;
 if(!token||!/^[a-z0-9]{20}$/.test(ref||''))throw Error('SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required.');
 const schema='b2b_ops_test_'+crypto.randomBytes(8).toString('hex');
 const query=async query=>{const r=await fetch('https://api.supabase.com/v1/projects/'+ref+'/database/query',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query})});
 if(!r.ok)throw Error('SQL '+r.status+' '+(await r.text()).slice(0,2000));return r.json();};
 const map=s=>s.replaceAll('public.',schema+'.').replaceAll("'public'","'"+schema+"'").replaceAll('auth.users',schema+'.auth_users');
 const id=()=>crypto.randomUUID(),staff=id(),buyer=id(),price=id(),key=id(),hash='a'.repeat(64),list='00000000-0000-4000-8000-000000000201';
 const json=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
 const migration=fs.readFileSync('supabase/migrations/20261003190000_b2b_orders.sql','utf8');
 let created=false;
 try{
  const clones=['commercial_inquiries','b2b_quote_drafts','b2b_inquiry_activities','b2b_pi_documents','b2b_pi_events','b2b_notification_outbox','b2b_pricing_audit','b2b_exchange_rates','b2b_access_audit','user_profiles','customer_accounts','companies','company_members','products','b2b_price_lists','b2b_price_revisions','b2b_schema_versions'];
  await query('CREATE SCHEMA '+schema+';');created=true;
  await query('CREATE TABLE '+schema+'.auth_users(id uuid PRIMARY KEY);'+clones.map(t=>'CREATE TABLE '+schema+'.'+t+' (LIKE public.'+t+' INCLUDING ALL);').join('\n'));
  await query(map(migration));
  await query(map(fs.readFileSync('supabase/migrations/20261003210000_b2b_operations.sql','utf8')));
  const product=(await query("SELECT id FROM public.products ORDER BY id LIMIT 1"))[0]?.id;
  if(!product)throw Error('At least one product structure is required.');
  // Copy one product only into the private test schema. No production price, customer or order is changed.
  await query("INSERT INTO "+schema+".products SELECT * FROM public.products WHERE id='"+product.replaceAll("'","''")+"';"+
   "INSERT INTO "+schema+".auth_users VALUES('"+staff+"'),('"+buyer+"');"+
   "INSERT INTO "+schema+".user_profiles(id,email,name,role,status) VALUES('"+staff+"','staff@example.invalid','Sandbox staff','admin','active');"+
   "INSERT INTO "+schema+".customer_accounts(id,email,name) VALUES('"+buyer+"','buyer@example.invalid','Sandbox buyer');"+
   "INSERT INTO "+schema+".b2b_price_lists(id,name,scope) VALUES('"+list+"','Sandbox only','common');"+
   "INSERT INTO "+schema+".b2b_price_revisions(id,product_id,price_list_id,version,status,price_unit,unit_price_krw,tax_code,vat_included,minimum_order_unit,minimum_order_quantity,valid_from,valid_until,review_source,change_reason,created_by) VALUES('"+price+"','"+product.replaceAll("'","''")+"','"+list+"',1,'approved','EA',1100,'vat10',true,'EA',1,now()-interval '1 day',now()+interval '1 day','Sandbox','Sandbox','"+staff+"');");
  const lines=[{product_id:product,name:'Sandbox food',sku:'TEST',storage:'ambient',quantity:10,unit:'EA',currency:'KRW',tax_code:'vat10',ea_per_unit:1,price_version_id:price,price_version:1,valid_until:'2099-01-01T00:00:00Z',unit_net_minor:1000,unit_tax_minor:100,unit_total_minor:1100,net_minor:10000,tax_minor:1000,total_minor:11000}];
  const delivery={recipient:'Sandbox buyer',phone:'01000000000',postal_code:'12345',address:'TEST-ONLY',address_detail:'',desired_date:'',temperature:'ambient',note:''};
  const submit="SELECT "+schema+".b2b_order_submit('"+buyer+"',NULL,'"+key+"','"+hash+"',"+json(delivery)+",'{}',"+json(lines)+") AS id;";
  const results=await Promise.all([query(submit),query(submit)]);
  assert.equal(results[0][0].id,results[1][0].id);
  const order=results[0][0].id;
  assert.equal(Number((await query('SELECT count(*) AS n FROM '+schema+'.b2b_orders'))[0].n),1);
  const plan=(key,revision)=>"SELECT "+schema+".b2b_ops_plan('"+staff+"','order','"+order+"',"+revision+",'"+staff+"',now()+interval '1 day','Sandbox handoff','"+key+"','"+hash+"');";
  const duplicate=id();await Promise.all([query(plan(duplicate,1)),query(plan(duplicate,1))]);
  assert.equal(Number((await query('SELECT revision AS n FROM '+schema+'.b2b_orders'))[0].n),2);
  const race=await Promise.allSettled([query(plan(id(),2)),query(plan(id(),2))]);
  assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
  assert.match(race.find(r=>r.status==='rejected').reason.message,/stale plan/);
  assert.equal(Number((await query('SELECT revision AS n FROM '+schema+'.b2b_orders'))[0].n),3);
  assert.equal(Number((await query("SELECT count(*) AS n FROM "+schema+".b2b_order_events WHERE action='work_plan'"))[0].n),2);
  console.log('PASS: concurrent duplicate work plans -> one event; competing plans at same revision -> one success and one conflict.');
 }finally{
  if(created){
   if(!/^b2b_ops_test_[a-f0-9]{16}$/.test(schema))throw Error('Unsafe cleanup target');
   await query('DROP SCHEMA '+schema+' CASCADE;');
   assert.equal((await query("SELECT nspname FROM pg_namespace WHERE nspname='"+schema+"'")).length,0);
   console.log('Temporary test schema removed. No production customers, prices, orders or stock were changed.');
  }
 }
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
