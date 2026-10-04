import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
const id='00000000-0000-4000-8000-000000000930';
function relay(options:{authorized?:boolean;role?:string;claimed?:boolean;verifyFail?:boolean;sendError?:unknown;finishFail?:boolean}={}){
 const sendMail=jest.fn(async()=>{if(options.sendError)throw options.sendError;return {accepted:['verified@example.invalid']};}),verify=jest.fn(async()=>{if(options.verifyFail)throw {code:'EAUTH'};return true;}),close=jest.fn();
 const rpc=jest.fn(async(name:string)=>name==='b2b_mail_prepare'?{data:{origin:'https://shop.example',claimed:options.claimed!==false,delivery:{token:'lease',attempt:1,state:'accepted'},payload:{recipient:'verified@example.invalid'}}}:name==='b2b_mail_finish'?{data:{state:'accepted'},error:options.finishFail?{code:'lost'}:null}:{data:{last_code:'SMTP_VERIFIED'}});
 const db={rpc,from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{role:options.role||'admin',status:'active'}})})};
 let handler:(r:Request)=>Promise<Response>=async()=>new Response('',{status:500});
 let code=fs.readFileSync('supabase/functions/b2b-notification-relay/index.ts','utf8');
 code=code.replace("import {mailMessage} from '../_shared/mail-message.ts';",fs.readFileSync('supabase/functions/_shared/mail-message.ts','utf8').replace(/export /g,''));
 const output=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(output,{exports:{},require:(name:string)=>name.startsWith('npm:nodemailer')?{createTransport:()=>({verify,sendMail,close})}:name.startsWith('npm:@supabase')?{createClient:()=>db}:null,Deno:{env:{get:(key:string)=>({SUPABASE_SERVICE_ROLE_KEY:'server-only-key',SUPABASE_URL:'https://db.example',B2B_GMAIL_USER:'sender@example.invalid',B2B_GMAIL_PASSWORD:'fake-app-password',B2B_APP_ORIGIN:'https://shop.example'} as Record<string,string>)[key]},serve:(fn:typeof handler)=>{handler=fn;}},Request,Response,URL,TextEncoder,crypto:webcrypto});
 const call=(action='send')=>handler(new Request('https://db.example/functions/v1/mail',{method:'POST',headers:{Authorization:'Bearer '+(options.authorized===false?'anon':'server-only-key')},body:JSON.stringify({actor:'admin',action,id,request_key:id,hash:'a'.repeat(64),reason:'QA only'})}));
 return {call,rpc,sendMail,verify,close};
}
test('non-service token cannot send or even inspect data',async()=>{const r=relay({authorized:false});expect((await r.call()).status).toBe(403);expect(r.rpc).not.toHaveBeenCalled();expect(r.sendMail).not.toHaveBeenCalled();});
test('verification authenticates but sends no mail',async()=>{const r=relay();expect((await r.call('verify')).status).toBe(200);expect(r.verify).toHaveBeenCalledTimes(1);expect(r.sendMail).not.toHaveBeenCalled();expect(r.rpc).toHaveBeenCalledWith('b2b_mail_verify',expect.objectContaining({p_ok:true,p_origin:'https://shop.example'}));});
test('inquiry staff cannot verify transport and customer cannot send',async()=>{for(const role of ['viewer','customer','product_staff']){const r=relay({role});expect((await r.call()).status).toBe(403);expect(r.sendMail).not.toHaveBeenCalled();}expect((await relay({role:'inquiry_staff'}).call('verify')).status).toBe(403);});
test('claim replay never opens another SMTP send',async()=>{const r=relay({claimed:false});expect((await r.call()).status).toBe(200);expect(r.sendMail).not.toHaveBeenCalled();});
test('canonical recipient and branded notice reach SMTP without attachment or secret links',async()=>{
 const r=relay();expect((await r.call()).status).toBe(200);expect(r.sendMail).toHaveBeenCalledWith(expect.objectContaining({to:'verified@example.invalid',subject:expect.stringContaining('송영민푸드')}));const p=r.sendMail.mock.calls[0] as unknown as [Record<string,unknown>];expect(p[0].attachments).toBeUndefined();expect(p[0].html).not.toMatch(/token=|signed/);expect(r.rpc).toHaveBeenCalledWith('b2b_mail_finish',expect.objectContaining({p_result:'accepted',p_code:'SMTP_ACCEPTED'}));
});
test.each([[{code:'EAUTH'},'failed','SMTP_AUTH_FAILED'],[{responseCode:550},'failed','SMTP_REJECTED'],[{code:'ESOCKET'},'uncertain','SEND_OUTCOME_UNKNOWN'],[{code:'ETIMEDOUT'},'uncertain','SEND_OUTCOME_UNKNOWN']])('SMTP outcome classification %j',async(error,state,code)=>{const r=relay({sendError:error});await r.call();expect(r.rpc).toHaveBeenCalledWith('b2b_mail_finish',expect.objectContaining({p_result:state,p_code:code}));expect(r.sendMail).toHaveBeenCalledTimes(1);});
test('record write loss after acceptance returns uncertainty without retry',async()=>{const r=relay({finishFail:true});expect((await r.call()).status).toBe(503);expect(r.sendMail).toHaveBeenCalledTimes(1);expect(r.close).toHaveBeenCalled();});
