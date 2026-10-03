// Isolated browser QA. No production keys or real customer sessions.
const {spawn}=require('node:child_process');
const env={...process.env,SONGFOOD_QA_BUILD:'1',NEXT_PUBLIC_APP_URL:'http://127.0.0.1:3100',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:4011',NEXT_PUBLIC_SUPABASE_ANON_KEY:'qa_fixture_publishable_key_no_access',SUPABASE_SERVICE_ROLE_KEY:'qa_fixture_service_key_no_access',TOSS_SECRET_KEY:'',NEXT_TELEMETRY_DISABLED:'1'};
const children=[];
function run(file,args){const child=spawn(process.execPath,[file,...args],{env,stdio:'inherit',windowsHide:true});children.push(child);return child;}
function completed(child){return new Promise((resolve,reject)=>{child.on('exit',code=>code===0?resolve():reject(Error('QA child exited '+code)));child.on('error',reject);});}
const fixture=run('e2e/fixture-server.cjs',[]);
let stopping=false;
function stop(){if(stopping)return;stopping=true;for(const c of children)c.kill();process.exit();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);process.on('exit',()=>{for(const c of children)c.kill();});
(async()=>{for(let n=0;n<100;n++){try{const r=await fetch('http://127.0.0.1:4011/health');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 if(process.env.QA_DEV!=='1')await completed(run('node_modules/next/dist/bin/next',['build']));
 await completed(run('node_modules/next/dist/bin/next',[process.env.QA_DEV==='1'?'dev':'start','--hostname','127.0.0.1','--port','3100']));
})().catch(e=>{console.error(e.message);fixture.kill();process.exitCode=1;});
