// Test-only Supabase stand-in. Bound to loopback; never imports environment files.
const http=require('node:http'),crypto=require('node:crypto');
const products=Array.from({length:16},(_,i)=>({id:'qa-product-'+(i+1),name:'검증용 냉동 식품 '+(i+1),name_en:'QA frozen food '+(i+1),sku:'QA-'+String(i+1).padStart(3,'0'),brand:'QA ONLY',category:'냉동식품',collection:'QA',format:'1 kg',finish:'',color:'',look:'',net_weight:'1 kg',storage:'Frozen / 냉동',description:'QA fixture only. No commercial offer.',image_url:'/logo.png',is_featured:i<4,purchase_minimum:{unit:'CTN',quantity:2}}));
const ids={admin:'00000000-0000-4000-8000-000000000801',customer:'00000000-0000-4000-8000-000000000802',product_staff:'00000000-0000-4000-8000-000000000803'};
const tokens={admin:'a'.repeat(64),customer:'c'.repeat(64),product_staff:'b'.repeat(64)};
const initialProfile={name:'송영민푸드',owner:'',registration:'',ecommerce_registration:'',address:'',address_en:'',phone:'010-3889-3344',email:'3song876@daum.net',export_phone:'+82-10-2143-2120',privacy_contact:'',shipping_ko:'',shipping_en:'',returns_ko:'',returns_en:'',privacy_ko:'',privacy_en:''};
const future=()=>new Date(Date.now()+86400000*3).toISOString();
const prices=products.map((p,i)=>({id:'00000000-0000-4000-8000-'+String(1000+i).padStart(12,'0'),product_id:p.id,price_list_id:'00000000-0000-4000-8000-000000000811',version:1,status:'approved',price_unit:'EA',unit_price_krw:'1100',tax_code:'vat10',vat_included:true,ea_per_box:5,boxes_per_carton:2,ea_per_carton:10,minimum_order_unit:'CTN',minimum_order_quantity:2,export_moq_ctn:3,tiers:[],valid_from:'2020-01-01T00:00:00Z',valid_until:future(),fob_status:'included',loading_port:'Busan',review_source:'QA fixture',change_reason:'QA fixture only',cost_review:'QA only',created_by:ids.admin,approved_by:ids.admin,created_at:new Date().toISOString()}));
let settings,records,emails,unknown,requests,controls,controlEvents;
function reset(){controls={revision:1,inquiries_paused:false,orders_paused:false,pi_paused:false,owner:"",response_minutes:null,updated_at:new Date().toISOString()};controlEvents=[];settings={profile:{...initialProfile},revision:1,updated_at:new Date().toISOString()};records=[];emails=[];unknown=[];requests=new Map();}
reset();
function filtered(rows,u){return rows.filter(row=>[...u.searchParams].every(([k,v])=>!v.startsWith('eq.')||String(row[k])===v.slice(3)));}
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1:4011'),path=u.pathname;let body={};
 try{const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>100000)throw Error('too large');chunks.push(c);}if(chunks.length)body=JSON.parse(Buffer.concat(chunks).toString());}catch{res.writeHead(400).end('{}');return;}
 const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 if(path==='/__reset'){reset();return send({ok:true});}
 if(path==='/__state')return send({emails,unknown,settings,records});
 if(path==='/health')return send({ok:true});
 if(path==='/auth/v1/otp'){emails.push({redirect:u.searchParams.get('redirect_to'),email:body.email});return send({});}
 if(path.startsWith('/auth/v1/admin/users/')){
  const id=path.split('/').pop(),role=Object.keys(ids).find(k=>ids[k]===id);
  return send({id,email:role+'@example.invalid',email_confirmed_at:'2020-01-01T00:00:00Z',aud:'authenticated',role:'authenticated',user_metadata:{name:'QA '+role}});
 }
 if(path.startsWith('/rest/v1/rpc/')){
  const rpc=path.split('/').pop();
  if(rpc==='b2b_launch_snapshot')return send({products:16,priced_products:16,exchange_ready:true,bank_ready:false,issuer_ready:false,private_pi_storage:true,notification_transport:'test_inbox',failed_notifications:0,preparing_pi:0,checked_at:new Date().toISOString()});
  if(rpc==='b2b_save_service_controls'){if(body.p_actor!==ids.admin)return send({code:'42501'},403);if(body.p_revision!==controls.revision)return send({code:'40001'},409);const before=controls;controls={...body.p_state,revision:controls.revision+1,updated_at:new Date().toISOString()};controlEvents.unshift({revision:controls.revision,reason:body.p_reason,created_at:controls.updated_at,before_state:before,after_state:controls});return send(controls);}
  if(rpc==='b2b_order_list')return send({orders:[],total:0});
  if(rpc==='b2b_consume_rate_limit')return send(true);
  if(rpc==='b2b_save_business_settings'){
   if(body.p_actor!==ids.admin)return send({code:'42501',message:'forbidden'},403);
   if(body.p_revision!==settings.revision)return send({code:'40001',message:'conflict'},409);
   settings={profile:body.p_profile,revision:settings.revision+1,updated_at:new Date().toISOString()};return send(settings);
  }
  if(rpc==='b2b_submit_inquiry'){
   const key=body.p_scope+body.p_key,old=requests.get(key);if(old)return send({id:old.inquiry_id,replayed:true});
   const id=crypto.randomUUID();records.push({...body.p_data,id,status:'new',created_at:new Date().toISOString()});
   requests.set(key,{scope_hash:body.p_scope,request_key:body.p_key,request_hash:body.p_hash,inquiry_id:id});return send({id,replayed:false});
  }
  if(rpc==='b2b_ops_snapshot'){
   if(body.p_mode==='quality')return send({products,lists:[],revisions:[],rate:null,as_of:new Date().toISOString()});
   return send({items:body.p_mode==='work'?[{id:'00000000-0000-4000-8000-000000000820',kind:'inquiry',title:'QA fixture RFQ',subtitle:'검증용 요청 / fixture only',status:'new',tags:['rfq'],revision:1,assigned_to:null,due_at:null}]:[],total:body.p_mode==='work'?1:0,counts:{rfq:1},as_of:new Date().toISOString(),page:1,page_size:30,staff:[]});
  }
 }
 if(path.startsWith('/rest/v1/')){
  const table=path.slice('/rest/v1/'.length);let rows;const one=req.headers.accept?.includes('vnd.pgrst.object');
  if(table==='b2b_service_controls')rows=[{id:true,...controls}];
  else if(table==='b2b_service_control_events')rows=controlEvents;
  else if(table==='products')rows=products;
  else if(table==='b2b_business_settings')rows=[{id:true,...settings}];
  else if(table==='b2b_sessions'){
   const hash=u.searchParams.get('token_hash')?.slice(3),role=Object.keys(tokens).find(k=>crypto.createHash('sha256').update(tokens[k]).digest('hex')===hash);
   return send(role?{user_id:ids[role],expires_at:future()}:null);
  }
  else if(table==='user_profiles')rows=Object.entries(ids).filter(([r])=>r!=='customer').map(([role,id])=>({id,role,status:'active',name:'QA '+role,email:role+'@example.invalid'}));
  else if(table==='customer_accounts')rows=[{id:ids.customer,name:'QA Buyer',email:'buyer@example.invalid',status:'active'}];
  else if(table==='b2b_price_lists')rows=[{id:prices[0].price_list_id,name:'QA ONLY',scope:'common',company_id:null,active:true}];
  else if(table==='b2b_price_revisions')rows=prices;
  else if(table==='b2b_exchange_rates')rows=[{id:'00000000-0000-4000-8000-000000000830',krw_per_usd:'1250',observed_at:new Date().toISOString(),valid_until:future(),source:'QA ONLY',created_at:new Date().toISOString()}];
  else if(table==='commercial_inquiries')rows=records;
  else if(table==='b2b_inquiry_requests')rows=[...requests.values()];
  else if(['menus','menu_items','company_members','hero_slides','content_blocks','b2b_pi_documents','b2b_inquiry_activities','b2b_orders','b2b_order_settings'].includes(table))rows=[];
  if(rows){if(table!=='b2b_business_settings')rows=filtered(rows,u);return send(one?rows[0]||null:rows);}
 }
 unknown.push({path,method:req.method});return send({message:'Unhandled QA fixture endpoint'},501);
});
server.listen(4011,'127.0.0.1',()=>console.log('QA fixture server ready on loopback'));
