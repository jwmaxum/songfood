/* eslint-disable @typescript-eslint/no-require-imports */
// Explicit integration test: creates an isolated, non-exposed schema, tests concurrent RPCs, then drops only that schema.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
async function run(){
 if(!process.argv.includes('--allow-sandbox-schema'))throw Error('Pass --allow-sandbox-schema to authorize a temporary isolated database schema.');
 const token=process.env.SUPABASE_ACCESS_TOKEN,ref=process.env.SUPABASE_PROJECT_REF;
 if(!token||!/^[a-z0-9]{20}$/.test(ref||''))throw Error('SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required.');
 const schema='b2b_order_test_'+crypto.randomBytes(8).toString('hex');
 const query=async query=>{const r=await fetch('https://api.supabase.com/v1/projects/'+ref+'/database/query',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query})});
 if(!r.ok)throw Error('SQL '+r.status+' '+(await r.text()).slice(0,2000));return r.json();};
 const map=s=>s.replaceAll('public.',schema+'.').replaceAll("'public'","'"+schema+"'").replaceAll('auth.users',schema+'.auth_users');
 const id=()=>crypto.randomUUID(),staff=id(),buyer=id(),price=id(),key=id(),hash='a'.repeat(64),list='00000000-0000-4000-8000-000000000201';
 const json=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
 const migration=fs.readFileSync('supabase/migrations/20261003190000_b2b_orders.sql','utf8');
 let created=false;
 try{
  const clones=['user_profiles','customer_accounts','companies','company_members','products','b2b_price_lists','b2b_price_revisions','b2b_schema_versions'];
  await query('CREATE SCHEMA '+schema+';');created=true;
  await query('CREATE TABLE '+schema+'.auth_users(id uuid PRIMARY KEY);'+clones.map(t=>'CREATE TABLE '+schema+'.'+t+' (LIKE public.'+t+' INCLUDING ALL);').join('\n'));
  await query(map(migration));
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
  const action=(actor,staffMode,revision,name,data,k=id())=>"SELECT "+schema+".b2b_order_action('"+actor+"','"+order+"',"+staffMode+","+revision+",'"+k+"','"+hash+"','"+name+"',"+json(data)+") AS id;";
  await query("SELECT "+schema+".b2b_order_settings_save('"+staff+"',0,'{\"bank\":\"SANDBOX\",\"account\":\"TEST-ONLY\",\"holder\":\"TEST\"}');");
  const today=(await query("SELECT (now() AT TIME ZONE 'Asia/Seoul')::date::text AS d"))[0].d;
  await query(action(staff,true,1,'review',{shipping_net_minor:1000,shipping_tax_minor:100,shipping_tax_code:'vat10',supply_confirmed:true,ship_date:today,temperature:'ambient',note:'Sandbox supply confirmation'}));
  await query(action(buyer,false,2,'accept',{}));
  const paymentKey=id(),payment=action(staff,true,3,'deposit',{amount_minor:12100,reference:'sandbox-bank-1',evidence:'Sandbox evidence',occurred_at:new Date().toISOString()},paymentKey);
  await Promise.all([query(payment),query(payment)]);
  assert.equal(Number((await query('SELECT paid_minor AS n FROM '+schema+".b2b_orders WHERE id='"+order+"'"))[0].n),12100);
  assert.equal(Number((await query('SELECT count(*) AS n FROM '+schema+'.b2b_order_payments'))[0].n),1);
  const item=(await query('SELECT id FROM '+schema+'.b2b_order_items'))[0].id;
  // Two distinct shipments each request 6 of the 10 units at the same revision: exactly one wins.
  const shipping=n=>action(staff,true,4,'ship',{carrier:'direct',tracking:'sandbox-truck-'+n,temperature:'ambient',note:'Sandbox shipment',items:[{item_id:item,quantity:6}]});
  const shipments=await Promise.allSettled([query(shipping(1)),query(shipping(2))]);
  assert.equal(shipments.filter(r=>r.status==='fulfilled').length,1);
  assert.match(shipments.find(r=>r.status==='rejected').reason.message,/stale order/);
  assert.equal(Number((await query('SELECT shipped_quantity AS n FROM '+schema+'.b2b_order_items'))[0].n),6);
  // Shipment vs full cancellation cannot erase a partially shipped order.
  const race=await Promise.allSettled([
   query(action(staff,true,5,'ship',{carrier:'direct',tracking:'sandbox-truck-final',temperature:'ambient',note:'Final four',items:[{item_id:item,quantity:4}]})),
   query(action(staff,true,5,'cancel',{message:'Concurrent cancellation'}))
  ]);
  assert.equal(race[0].status,'fulfilled');assert.equal(race[1].status,'rejected');
  const final=(await query('SELECT status,paid_minor,(SELECT sum(shipped_quantity) FROM '+schema+'.b2b_order_items) AS shipped FROM '+schema+'.b2b_orders'))[0];
  assert.equal(final.status,'completed');assert.equal(Number(final.shipped),10);assert.equal(Number(final.paid_minor),12100);
  console.log('PASS: two concurrent submits -> one order; duplicate deposit -> one ledger entry; competing shipments -> no overship; shipment/cancel race -> immutable shipping history.');
 }finally{
  if(created){
   if(!/^b2b_order_test_[a-f0-9]{16}$/.test(schema))throw Error('Unsafe cleanup target');
   await query('DROP SCHEMA '+schema+' CASCADE;');
   assert.equal((await query("SELECT nspname FROM pg_namespace WHERE nspname='"+schema+"'")).length,0);
   console.log('Temporary test schema removed. No production customers, prices, orders or stock were changed.');
  }
 }
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
