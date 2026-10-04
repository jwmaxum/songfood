import nodemailer from 'npm:nodemailer@10.0.14';
import {createClient} from 'npm:@supabase/supabase-js@2.111.0';
import {mailMessage} from '../_shared/mail-message.ts';
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const db=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
const answer=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
async function authorized(request:Request){
 const supplied=request.headers.get('authorization')||'',expected='Bearer '+key;
 if(!key||supplied.length!==expected.length)return false;
 const [a,b]=await Promise.all([supplied,expected].map(v=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))));
 const aa=new Uint8Array(a),bb=new Uint8Array(b);let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];return diff===0;
}
Deno.serve(async request=>{
 if(request.method!=='POST'||!await authorized(request))return answer({error:'forbidden'},403);
 let body;try{const text=await request.text();if(text.length>4096)throw Error();body=JSON.parse(text);}catch{return answer({error:'invalid request'},400);}
 if(!body||typeof body.actor!=='string'||!['verify','send'].includes(body.action))return answer({error:'invalid action'},400);
 // Validate actor before opening a network connection, including verification-only requests.
 const actor=await db.from('user_profiles').select('role,status').eq('id',body.actor).maybeSingle();
 if(actor.error||actor.data?.status!=='active'||!['admin','inquiry_staff'].includes(actor.data.role)||(body.action==='verify'&&actor.data.role!=='admin'))return answer({error:'forbidden'},403);
 const user=Deno.env.get('B2B_GMAIL_USER'),pass=Deno.env.get('B2B_GMAIL_PASSWORD');
 if(!user||!pass)return answer({error:'SMTP_NOT_CONFIGURED'},503);
 const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,pool:false,auth:{user,pass},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:25000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true});
 try{
  if(body.action==='verify'){
   let ok=false,diagnostic={code:'',command:'',category:''};try{await transport.verify();ok=true;}catch(error){const e=error as {code?:string;command?:string;message?:string};diagnostic={code:/^[A-Z0-9_]{1,40}$/.test(e.code||'')?e.code!:'UNCLASSIFIED',command:['CONN','CONNECT','AUTH','EHLO','STARTTLS'].includes(e.command||'')?e.command!:'',category:/not implemented|not a function|unsupported/i.test(e.message||'')?'RUNTIME_UNSUPPORTED':/certificate|TLS/i.test(e.message||'')?'TLS_ERROR':'CONNECTION_OR_AUTH'};}
   const saved=await db.rpc('b2b_mail_verify',{p_actor:body.actor,p_ok:ok,p_origin:Deno.env.get('B2B_APP_ORIGIN')||''});
   if(saved.error)return answer({error:'VERIFY_RECORD_FAILED'},503);
   return answer({success:ok,transport:saved.data,diagnostic},ok?200:503);
  }
  const claim=await db.rpc('b2b_mail_prepare',{p_actor:body.actor,p_id:body.id,p_action:'send',p_key:body.request_key,p_hash:body.hash,p_reason:body.reason});
  if(claim.error)return answer({error:'CLAIM_REJECTED',code:claim.error.code},claim.error.code==='42501'?403:409);
  if(!claim.data.claimed)return answer({success:true,delivery:claim.data.delivery,replayed:true});
  const d=claim.data.delivery;
  let state='uncertain',code='SEND_OUTCOME_UNKNOWN';
  try{
   const message=mailMessage(claim.data.origin);
   const result=await transport.sendMail({from:{name:'송영민푸드 | Song Young Min Food',address:user},to:claim.data.payload.recipient,messageId:'<songfood-'+body.id+'-'+d.attempt+'@gmail.com>',subject:message.subject,text:message.text,html:message.html});
   if(result.accepted?.length===1){state='accepted';code='SMTP_ACCEPTED';}else{state='failed';code='SMTP_REJECTED';}
  }catch(error){
   const e=error as {code?:string;responseCode?:number};
   if(e.code==='EAUTH'){state='failed';code='SMTP_AUTH_FAILED';}
   else if(e.responseCode&&e.responseCode>=400){state='failed';code='SMTP_REJECTED';}
   // Network loss can follow Gmail acceptance; never silently retry it.
  }
  const done=await db.rpc('b2b_mail_finish',{p_actor:body.actor,p_id:body.id,p_token:d.token,p_result:state,p_code:code});
  if(done.error)return answer({error:'SEND_RECORD_UNCERTAIN'},503);
  return answer({success:done.data.state==='accepted',delivery:done.data},200);
 }finally{transport.close();}
});
