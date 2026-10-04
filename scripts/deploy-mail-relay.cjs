// Deploy only the relay in the explicitly named project. Never sends an email.
const fs=require('node:fs'),path=require('node:path'),{parseEnv}=require('node:util');
async function deploy(file){
 if(!file)throw Error('Usage: npm run deploy:mail -- <private-env-file>');
 const env=parseEnv(fs.readFileSync(path.resolve(file),'utf8'));
 const url=new URL(env.NEXT_PUBLIC_SUPABASE_URL),origin=new URL(env.B2B_APP_ORIGIN);
 if(url.protocol!=='https:'||!/^([a-z0-9]+)\.supabase\.co$/.test(url.hostname)||origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('Explicit Supabase project and HTTPS app origin required');
 if(!/^sbp_[A-Za-z0-9_-]+$/.test(env.SUPABASE_ACCESS_TOKEN||''))throw Error('Supabase management token required');
 const password=(env.GMAIL_APP_PASSWORD||'').replace(/\s/g,'');
 if(!/^[a-z]{16}$/i.test(password)||!/^[^\s@]+@gmail\.com$/.test(env.GMAIL_USER||''))throw Error('Gmail account and 16-character app password required');
 const ref=url.hostname.split('.')[0],base='https://api.supabase.com/v1/projects/'+ref;
 async function call(route,method='GET',body){
  const r=await fetch(base+route,{method,headers:{Authorization:'Bearer '+env.SUPABASE_ACCESS_TOKEN,...(body instanceof FormData?{}:body?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw Error('Relay setup HTTP '+r.status+'; provider details omitted.');
  return r.json();
 }
 const versions=await call('/database/query','POST',{query:"select id from public.b2b_schema_versions where id='20261004170000_b2b_release_availability'"});
 if(versions.length!==1)throw Error('Apply B2B-10 database migrations before deploying relay');
 const auth=await call('/config/auth');
 if(auth.smtp_host!=='smtp.gmail.com'||auth.smtp_user!==env.GMAIL_USER)throw Error('Relay sender must match the configured Supabase Gmail sender');
 await call('/secrets','POST',[{name:'B2B_GMAIL_USER',value:env.GMAIL_USER},{name:'B2B_GMAIL_PASSWORD',value:password},{name:'B2B_APP_ORIGIN',value:origin.origin}]);
 let source=fs.readFileSync('supabase/functions/b2b-notification-relay/index.ts','utf8');
 source=source.replace("import {mailMessage} from '../_shared/mail-message.ts';",()=>fs.readFileSync('supabase/functions/_shared/mail-message.ts','utf8').replace(/export /g,''));
 const form=new FormData();form.append('metadata',JSON.stringify({name:'b2b-notification-relay',entrypoint_path:'index.ts',verify_jwt:true}));form.append('file',new Blob([source],{type:'application/typescript'}),'index.ts');
 const result=await call('/functions/deploy?slug=b2b-notification-relay','POST',form);
 console.log(JSON.stringify({project:ref,name:result.name,status:result.status,version:result.version,mail_sent:false}));
}
if(require.main===module)deploy(process.argv[2]).catch(()=>{console.error('Relay setup failed. Check the explicit private environment file, management permission and migrations. Secrets/provider responses omitted.');process.exitCode=1;});
module.exports={deploy};
