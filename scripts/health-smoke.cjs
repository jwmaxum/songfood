// Read-only production/staging checks. No emails, test orders or credentials.
const targets=['/api/health','/shop?lang=ko','/shop?lang=en','/api/orders','/api/account/pi','/api/admin/launch'];
async function smoke(origin){
 const u=new URL(origin);if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))throw Error('HTTPS or loopback origin required');
 const results=[];for(const p of targets){
  const start=Date.now(),r=await fetch(new URL(p,u),{redirect:'manual',signal:AbortSignal.timeout(20000)}),body=await r.text();
  const expected=p==='/api/orders'||p==='/api/account/pi'?401:p==='/api/admin/launch'?403:200;
  const language=p.includes('lang=en')?'en':p.includes('lang=ko')?'ko':null;
  const ok=r.status===expected&&(p!=='/api/health'||JSON.parse(body).status==='ok')&&(!language||body.includes('<html lang="'+language+'"'));
  results.push({path:p,status:r.status,expected,ok,ms:Date.now()-start});
 }
 return {origin:u.origin,at:new Date().toISOString(),ok:results.every(r=>r.ok),results};
}
if(require.main===module)smoke(process.argv[2]||'https://song-food.jwmaxum.workers.dev').then(d=>{console.log(JSON.stringify(d,null,2));if(!d.ok)process.exitCode=1;}).catch(()=>{console.error('Health checks unavailable');process.exitCode=1;});
module.exports={smoke};
