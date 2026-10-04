// Explicit environment file is mandatory; production .env.local is never a fallback.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {checkCloudflareBuild}=require('./check-cloudflare-build.cjs');
const {parseEnv}=require('node:util');
const {treeHash}=require('./worker-target.cjs');
const PROD_REF='ejtozvlsnagtpsddhhoj',PROD_APP='https://song-food.jwmaxum.workers.dev';
function checkStaging(env){
 checkCloudflareBuild(env);
 const db=new URL(env.NEXT_PUBLIC_SUPABASE_URL),app=new URL(env.NEXT_PUBLIC_APP_URL);
 if(db.hostname===PROD_REF+'.supabase.co'||app.origin===PROD_APP||!app.hostname.startsWith('song-food-staging.'))throw Error('Staging must use an independent Supabase project and song-food-staging HTTPS origin.');
 if(!env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SERVICE_ROLE_KEY.length<20||/^sbp_/.test(env.SUPABASE_SERVICE_ROLE_KEY))throw Error('Staging server secret is required.');
 let serverRole=false;try{serverRole=JSON.parse(Buffer.from(env.SUPABASE_SERVICE_ROLE_KEY.split('.')[1],'base64url')).role==='service_role';}catch{/* Secret keys are opaque. */}
 if(!/^sb_secret_[A-Za-z0-9_-]{20,}$/.test(env.SUPABASE_SERVICE_ROLE_KEY)&&!serverRole)throw Error('Staging requires a server secret or legacy service_role key.');
 if(env.SUPABASE_SERVICE_ROLE_KEY===env.NEXT_PUBLIC_SUPABASE_ANON_KEY||/^sb_publishable_/.test(env.SUPABASE_SERVICE_ROLE_KEY))throw Error('Staging server secret cannot be a public key.');
 for(const key of [env.NEXT_PUBLIC_SUPABASE_ANON_KEY,env.SUPABASE_SERVICE_ROLE_KEY]){
  try{const jwt=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));if(jwt.ref===PROD_REF)throw Error('Production key detected in staging.');}catch(e){if(e.message==='Production key detected in staging.')throw e;}
 }
 return {project:db.hostname,origin:app.origin};
}
function main(){
 const action=process.argv[2],file=process.argv[3];if(!['check','build','deploy','preview'].includes(action)||!file)throw Error('Usage: node scripts/staging-worker.cjs check|build|deploy|preview <private-env-file>');
 const env={...process.env};for(const k of ['NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','TOSS_SECRET_KEY'])delete env[k];
 const values=parseEnv(fs.readFileSync(path.resolve(file),'utf8'));
 for(const k of ['NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY']){if(!values[k])throw Error('Missing staging variable: '+k);env[k]=values[k];}
 for(const k of ['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN'])if(values[k])env[k]=values[k];
 env.TOSS_SECRET_KEY='';env.SONGFOOD_QA_BUILD='0';
 const info=checkStaging(env);
 console.log('Independent staging configuration verified (secrets omitted).');
 if(action==='check')return;
 const stamp='.open-next/staging-build.json';
 if(action==='deploy'||action==='preview'){const m=JSON.parse(fs.readFileSync(stamp,'utf8'));if(m.project!==info.project||m.origin!==info.origin||m.worker_sha256!==treeHash())throw Error('Rebuild this staging environment before deployment.');}
 const args=['node_modules/@opennextjs/cloudflare/dist/cli/index.js',action==='preview'?'preview':action,'--env','staging'];
 if(action==='deploy')args.push('--','--keep-vars');
 const r=cp.spawnSync(process.execPath,args,{env,stdio:'inherit',windowsHide:true});if(r.status!==0)throw Error('Staging '+action+' failed.');
 if(action==='build')fs.writeFileSync(stamp,JSON.stringify({...info,worker_sha256:treeHash(),at:new Date().toISOString()},null,2));
}
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={checkStaging};
