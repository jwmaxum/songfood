// Test-only Supabase stand-in. Bound to loopback; never imports environment files.
const http=require('node:http'),crypto=require('node:crypto');
const products=Array.from({length:16},(_,i)=>({id:'qa-product-'+(i+1),name:'검증용 냉동 식품 '+(i+1),name_en:'QA frozen food '+(i+1),sku:'QA-'+String(i+1).padStart(3,'0'),brand:'QA ONLY',category:'냉동식품',collection:'QA',format:'1 kg',finish:'',color:'',look:'',net_weight:'1 kg',storage:'Frozen / 냉동',description:'QA fixture only. No commercial offer.',image_url:'/logo.png',is_featured:i<4,purchase_minimum:{unit:'CTN',quantity:2}}));
const ids={admin:'00000000-0000-4000-8000-000000000801',customer:'00000000-0000-4000-8000-000000000802',product_staff:'00000000-0000-4000-8000-000000000803',sub_admin:'00000000-0000-4000-8000-000000000804'};
const tokens={admin:'a'.repeat(64),customer:'c'.repeat(64),product_staff:'b'.repeat(64),sub_admin:'d'.repeat(64)};
const initialProfile={name:'송영민푸드',owner:'',registration:'',ecommerce_registration:'',address:'',address_en:'',phone:'010-3889-3344',email:'3song876@daum.net',export_phone:'+82-10-2143-2120',privacy_contact:'',shipping_ko:'',shipping_en:'',returns_ko:'',returns_en:'',privacy_ko:'',privacy_en:''};
const future=()=>new Date(Date.now()+86400000*3).toISOString();
const prices=products.map((p,i)=>({id:'00000000-0000-4000-8000-'+String(1000+i).padStart(12,'0'),product_id:p.id,price_list_id:'00000000-0000-4000-8000-000000000811',version:1,status:'approved',price_unit:'EA',unit_price_krw:'1100',tax_code:'vat10',vat_included:true,ea_per_box:5,boxes_per_carton:2,ea_per_carton:10,minimum_order_unit:'CTN',minimum_order_quantity:2,export_moq_ctn:3,tiers:[],valid_from:'2020-01-01T00:00:00Z',valid_until:future(),fob_status:'included',loading_port:'Busan',review_source:'QA fixture',change_reason:'QA fixture only',cost_review:'QA only',created_by:ids.admin,approved_by:ids.admin,created_at:new Date().toISOString()}));
let piSettings,settings,records,emails,unknown,requests,controls,controlEvents,releasePolicy,releaseReviews,releaseEvents,mailTransport,mailDelivery,documentEmails,staffRecords,staffEvents,invalidStaffSessions,sessions,customerAccounts,handoverReviews,handoverEvents;
function reset(){piSettings=null;handoverReviews=[];handoverEvents=[];staffRecords=Object.entries(ids).filter(([r])=>r!=='customer').map(([role,id])=>({id,role:role==='sub_admin'?'admin':role,status:'active',name:'QA '+role,email:role==='admin'?'jwmaxum@gmail.com':role+'@example.invalid',revision:1,verified:true,auth_active:true,created_at:new Date().toISOString()}));staffEvents=[];sessions=[];customerAccounts=[{id:ids.customer,name:'QA Buyer',email:'buyer@example.invalid',status:'active'}];invalidStaffSessions=new Set();releasePolicy={enabled:false,revision:1};releaseReviews={};releaseEvents=[];mailTransport={verified_at:null,last_checked_at:null,last_code:'SMTP_VERIFY_FAILED'};mailDelivery={notification_id:'00000000-0000-4000-8000-000000000930',state:'queued',attempt:0,last_code:null,updated_at:new Date().toISOString()};documentEmails=[];controls={revision:1,inquiries_paused:false,orders_paused:false,pi_paused:false,owner_id:null,owner:"",response_minutes:null,updated_at:new Date().toISOString()};controlEvents=[];settings={profile:{...initialProfile},revision:1,updated_at:new Date().toISOString()};records=[];emails=[];unknown=[];requests=new Map();}
reset();
function filtered(rows,u){return rows.filter(row=>[...u.searchParams].every(([k,v])=>!v.startsWith('eq.')||String(row[k])===v.slice(3)));}
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1:4011'),path=u.pathname;let body={};
 try{const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>100000)throw Error('too large');chunks.push(c);}if(chunks.length)body=JSON.parse(Buffer.concat(chunks).toString());}catch{res.writeHead(400).end('{}');return;}
 const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 if(path==='/__reset'){reset();return send({ok:true});}
 if(path==='/__state')return send({emails,unknown,piSettings,settings,records,documentEmails,staffEvents,handoverReviews,handoverEvents});
 if(path==='/health')return send({ok:true});
 if(path==='/auth/v1/otp'){emails.push({redirect:u.searchParams.get('redirect_to'),email:body.email,createUser:body.create_user});return send({});}
 if(path==='/auth/v1/user')return send({id:ids.product_staff,email:'product_staff@example.invalid',email_confirmed_at:'2020-01-01T00:00:00Z',aud:'authenticated',role:'authenticated'});
 if(path.startsWith('/auth/v1/admin/users/')){
  const id=path.split('/').pop(),role=Object.keys(ids).find(k=>ids[k]===id);
  return send({id,email:role+'@example.invalid',email_confirmed_at:'2020-01-01T00:00:00Z',aud:'authenticated',role:'authenticated',user_metadata:{name:'QA '+role}});
 }

 if(path==='/functions/v1/b2b-notification-relay'){
  if(body.actor!==ids.admin)return send({error:'forbidden'},403);
  if(body.action==='verify'){mailTransport={verified_at:new Date().toISOString(),last_checked_at:new Date().toISOString(),last_code:'SMTP_VERIFIED'};return send({success:true,transport:mailTransport});}
  if(mailDelivery.state!=='accepted'){mailDelivery={...mailDelivery,state:'accepted',attempt:mailDelivery.attempt+1,last_code:'SMTP_ACCEPTED'};documentEmails.push({id:body.id,key:body.request_key});}
  return send({success:true,delivery:mailDelivery});
 }

 if(path.startsWith('/rest/v1/rpc/')){
  const rpc=path.split('/').pop();
  if(rpc==='b2b_pi_save_settings'){if(!staffRecords.some(s=>s.id===body.p_actor&&s.role==='admin'&&s.status==='active'&&!s.removed))return send({code:'42501'},403);if(body.p_expected!==(piSettings?.revision||0))return send({code:'40001'},409);piSettings={revision:(piSettings?.revision||0)+1,data:body.p_data};return send(piSettings);}
  if(rpc==='b2b_handover_snapshot'||rpc==='b2b_save_handover'){
   const actor=staffRecords.find(s=>s.id===body.p_actor&&s.status==='active'&&!s.removed);
   if(!actor)return send({code:'42501'},403);
   const definitions={access:['admin','product_staff','inquiry_staff','order_staff'],auth_mail:['admin','product_staff','inquiry_staff','order_staff'],catalogue:['admin','product_staff'],domestic:['admin','order_staff'],export:['admin','inquiry_staff'],document_mail:['admin','inquiry_staff'],operations:['admin'],business:['admin']};
   const hash=(staff,key)=>crypto.createHash('sha256').update(JSON.stringify({staff:staff.id,revision:staff.revision,role:staff.role,context:['access','auth_mail'].includes(key)?'identity':{settings:settings.revision,controls:controls.revision,releasePolicy,releaseReviews}})).digest('hex');
   if(rpc==='b2b_handover_snapshot')return send({actor_id:actor.id,role:actor.role,basis:Object.fromEntries(Object.keys(definitions).filter(k=>definitions[k].includes(actor.role)).map(k=>[k,hash(actor,k)])),staff:staffRecords.filter(s=>s.status==='active'&&!s.removed&&(actor.role==='admin'||s.id===actor.id)).map(({id,name,role})=>({id,name,role})),reviews:handoverReviews.filter(r=>actor.role==='admin'||r.staff_id===actor.id).map(r=>({...r,current:r.basis===hash(staffRecords.find(s=>s.id===r.staff_id),r.check_id)})),events:handoverEvents.filter(e=>actor.role==='admin'||e.staff_id===actor.id)});
   if(!definitions[body.p_check]?.includes(actor.role))return send({code:'42501'},403);
   const previous=handoverReviews.find(r=>r.staff_id===actor.id&&r.check_id===body.p_check);
   if(body.p_revision!==(previous?.revision||0)||body.p_hash!==hash(actor,body.p_check))return send({code:'40001'},409);
   if(body.p_result==='passed'&&(['domestic','export','document_mail'].includes(body.p_check)||['auth_mail','document_mail'].includes(body.p_check)&&!body.p_received))return send({code:'22023'},400);
   const review={staff_id:actor.id,check_id:body.p_check,revision:(previous?.revision||0)+1,result:body.p_result,notes:body.p_notes,reference_id:body.p_reference,received:body.p_received,basis:body.p_hash,reviewed_at:new Date().toISOString()};
   handoverReviews=handoverReviews.filter(r=>r!==previous);handoverReviews.push(review);handoverEvents.unshift({id:crypto.randomUUID(),staff_id:actor.id,check_id:body.p_check,result:body.p_result,notes:body.p_notes,created_at:review.reviewed_at});return send(review);
  }
  if(rpc==='b2b_is_super_admin')return send(body.p_actor===ids.admin);
  if(rpc==='b2b_staff_directory')return send(staffRecords.filter(s=>s.status==='active'&&!s.removed&&['admin','product_staff','inquiry_staff','order_staff'].includes(s.role)).map(({id,name,email,role})=>({id,name,email,role})));
  if(rpc==='b2b_staff_snapshot'){if(body.p_actor!==ids.admin)return send({code:'42501'},403);return send({super_admin_id:ids.admin,data:staffRecords.filter(s=>!s.removed&&s.role!=='viewer'),events:staffEvents});}
  if(rpc==='b2b_manage_staff'){
   if(body.p_actor!==ids.admin)return send({code:'42501'},403);
   let old=body.p_action==='register'?staffRecords.find(s=>s.email===body.p_email):staffRecords.find(s=>s.id===body.p_id);
   if(old?.id===ids.admin)return send({code:'42501'},403);
   if(body.p_action==='register'&&old&&!old.removed)return send({code:'23505'},409);
   if(body.p_action==='register'&&!old&&body.p_email!=='buyer@example.invalid')return send({code:'22023'},400);
   if(body.p_action!=='register'&&(!old||old.removed))return send({code:'P0002'},404);
   if(body.p_action!=='register'&&old.revision!==body.p_revision)return send({code:'40001'},409);
   const before=old?{...old}:null;
   let row={id:old?.id||ids.customer,email:old?.email||body.p_email,name:body.p_name||old?.name,role:body.p_role||'viewer',status:body.p_status||'suspended',revision:(old?.revision||0)+1,verified:true,auth_active:true,created_at:old?.created_at||new Date().toISOString(),removed:body.p_action==='remove'};
   if(old)staffRecords=staffRecords.map(s=>s.id===old.id?row:s);else staffRecords.push(row);
   invalidStaffSessions.add(row.id);
   staffEvents.unshift({id:crypto.randomUUID(),staff_id:row.id,event:body.p_action,reason:body.p_reason,created_at:new Date().toISOString(),before_state:before,after_state:row});
   if(controls.owner_id===row.id){const beforeControls={...controls};controls={...controls,owner_id:row.status==='active'&&!row.removed?row.id:null,owner:row.status==='active'&&!row.removed?row.name:'',revision:controls.revision+1};controlEvents.unshift({revision:controls.revision,reason:body.p_reason,created_at:new Date().toISOString(),before_state:beforeControls,after_state:controls});}
   return send(row);
  }


  if(rpc==='b2b_release_availability')return send({enabled:releasePolicy.enabled,products:Object.fromEntries(products.map(p=>[p.id,{domestic:!!releaseReviews[p.id]?.domestic,export:!!releaseReviews[p.id]?.export}]))});
  if(rpc==='b2b_release_snapshot')return send({policy:releasePolicy,products:products.map(p=>({product_id:p.id,name:p.name,sku:p.sku,fingerprint:'a'.repeat(64),domestic_issues:[],export_issues:[],review:releaseReviews[p.id]||null})),events:releaseEvents});
  if(rpc==='b2b_save_release'){if(body.p_actor!==ids.admin)return send({code:'42501'},403);const old=releaseReviews[body.p_id];if((old?.revision||0)!==body.p_revision)return send({code:'40001'},409);releaseReviews[body.p_id]={revision:(old?.revision||0)+1,domestic:body.p_domestic,export:body.p_export,fingerprint:body.p_hash,reason:body.p_reason,reviewed_at:new Date().toISOString()};releaseEvents.unshift({product_id:body.p_id,event:'review',reason:body.p_reason,created_at:new Date().toISOString()});return send(releaseReviews[body.p_id]);}
  if(rpc==='b2b_set_release_policy'){if(body.p_actor!==ids.admin)return send({code:'42501'},403);if(body.p_revision!==releasePolicy.revision)return send({code:'40001'},409);if(body.p_enabled&&!Object.values(releaseReviews).some(r=>r.domestic||r.export))return send({code:'22023'},400);releasePolicy={enabled:body.p_enabled,revision:releasePolicy.revision+1};return send(releasePolicy);}
  if(rpc==='b2b_mail_prepare'){
   if(![ids.admin].includes(body.p_actor))return send({code:'42501'},403);
   if(body.p_action==='reset'){mailDelivery={...mailDelivery,state:'queued'};return send({delivery:mailDelivery});}
   return send({origin:'https://song-food.jwmaxum.workers.dev',payload:{recipient:'buyer@example.invalid'},hash:'a'.repeat(64),delivery:mailDelivery});
  }

  if(rpc==='b2b_launch_snapshot')return send({products:16,priced_products:16,exchange_ready:true,bank_ready:false,issuer_ready:false,private_pi_storage:true,notification_transport:'test_inbox',failed_notifications:0,preparing_pi:0,checked_at:new Date().toISOString()});
  if(rpc==='b2b_save_service_controls'){if(body.p_actor!==ids.admin)return send({code:'42501'},403);if(body.p_revision!==controls.revision)return send({code:'40001'},409);const selected=staffRecords.find(s=>s.id===body.p_state.owner_id&&s.status==='active'&&!s.removed);if(body.p_state.owner_id&&!selected)return send({code:'22023'},400);const before=controls;controls={...body.p_state,owner:selected?.name||'',revision:controls.revision+1,updated_at:new Date().toISOString()};controlEvents.unshift({revision:controls.revision,reason:body.p_reason,created_at:controls.updated_at,before_state:before,after_state:controls});return send(controls);}
  if(rpc==='b2b_order_list')return send({orders:[],total:0});
  if(rpc==='b2b_consume_rate_limit')return send(true);
  if(rpc==='b2b_save_business_settings'){
   if(body.p_actor!==ids.admin)return send({code:'42501',message:'forbidden'},403);
   if(body.p_revision!==settings.revision)return send({code:'40001',message:'conflict'},409);
   settings={profile:body.p_profile,revision:settings.revision+1,updated_at:new Date().toISOString()};return send(settings);
  }
  if(rpc==='b2b_submit_inquiry'){
   const key=body.p_scope+body.p_key,old=requests.get(key);if(old)return send({id:old.inquiry_id,replayed:true});
   const id=crypto.randomUUID();records.push({...body.p_data,id,status:'new',revision:1,items:body.p_data.items||[],assigned_to:null,created_at:new Date().toISOString()});
   requests.set(key,{scope_hash:body.p_scope,request_key:body.p_key,request_hash:body.p_hash,inquiry_id:id});return send({id,replayed:false});
  }
  if(rpc==='b2b_initial_operations'){
   const role=staffRecords.find(s=>s.id===body.p_actor)?.role;
   if(!role)return send({code:'42501'},403);
   return send({role,as_of:new Date().toISOString(),metrics:{active:3,mine:0,unassigned:1,reassignment:1,overdue:1,soon:0},counts:role==='product_staff'?{}:{mail_unknown:2,mail_failed:1,rfq:1},service:{owner:controls.owner,response_minutes:controls.response_minutes,inquiries_paused:controls.inquiries_paused,orders_paused:controls.orders_paused,pi_paused:controls.pi_paused}});
  }
  if(rpc==='b2b_ops_snapshot'){
   if(body.p_mode==='quality')return send({products,lists:[],revisions:[],rate:null,as_of:new Date().toISOString()});
   return send({role:staffRecords.find(s=>s.id===body.p_actor)?.role,items:body.p_mode==='work'?[{id:'00000000-0000-4000-8000-000000000820',kind:'inquiry',title:body.p_category==='mail_unknown'?'QA actual mail follow-up':'QA fixture RFQ',subtitle:'검증용 요청 / fixture only',status:'new',tags:['rfq'],revision:1,assigned_to:null,due_at:null}]:[],total:body.p_mode==='work'?1:0,counts:{rfq:1,mail_unknown:2,mail_failed:1},as_of:new Date().toISOString(),page:1,page_size:30,staff:[]});
  }
 }
 if(path.startsWith('/rest/v1/')){
  const table=path.slice('/rest/v1/'.length);let rows;const one=req.headers.accept?.includes('vnd.pgrst.object');
  if(table==='b2b_service_controls')rows=[{id:true,...controls}];
  else if(table==='b2b_service_control_events')rows=controlEvents;

  else if(table==='b2b_mail_transport')rows=[{id:true,...mailTransport}];
  else if(table==='b2b_email_events')rows=[];
  else if(table==='b2b_email_deliveries')rows=mailDelivery.state==='queued'?[]:[mailDelivery];
  else if(table==='b2b_notification_outbox')rows=records.length?[{id:'00000000-0000-4000-8000-000000000930',inquiry_id:records[0].id,activity_id:'00000000-0000-4000-8000-000000000932',channel:'test_inbox',status:'queued',attempts:0,last_error:null,created_at:new Date().toISOString()}]:[];
  else if(table==='b2b_quote_drafts'||table==='b2b_notification_attempts')rows=[];

  else if(table==='products')rows=products;
  else if(table==='b2b_pi_settings')rows=piSettings?[{id:true,...piSettings}]:[];
  else if(table==='b2b_business_settings')rows=[{id:true,...settings}];
  else if(table==='b2b_sessions'){
   if(req.method==='POST'){sessions.push(body);return send(null,201);}
   const savedSession=filtered(sessions,u)[0];if(savedSession)return send(savedSession);
   const hash=u.searchParams.get('token_hash')?.slice(3),role=Object.keys(tokens).find(k=>crypto.createHash('sha256').update(tokens[k]).digest('hex')===hash);
   return send(role&&!(u.searchParams.get('audience')==='eq.staff'&&invalidStaffSessions.has(ids[role]))?{user_id:ids[role],expires_at:future()}:null);
  }
  else if(table==='user_profiles')rows=staffRecords;
  else if(table==='customer_accounts'){if(req.method==='POST'&&!customerAccounts.some(c=>c.id===body.id))customerAccounts.push({...body,status:'active'});rows=customerAccounts;}
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
