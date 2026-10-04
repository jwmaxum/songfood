import {GET,POST} from '@/app/api/admin/crm/notifications/[id]/email/route';
import {POST as verify} from '@/app/api/admin/mail/route';
import {crmStaff} from '@/lib/crm/repository';
import {opsStaff} from '@/lib/operations/repository';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {mailPreview,parseMailSend,callMailRelay} from '@/lib/notifications/repository';
import {mailMessage} from '../../supabase/functions/_shared/mail-message';
import {rateLimit,ApiError} from '@/lib/request-security';
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{rpc:jest.fn()},isAuthConfigured:()=>true}));
jest.mock('@/lib/crm/repository',()=>({...jest.requireActual('@/lib/crm/repository'),crmStaff:jest.fn()}));
jest.mock('@/lib/operations/repository',()=>({opsStaff:jest.fn()}));
jest.mock('@/lib/request-security',()=>({...jest.requireActual('@/lib/request-security'),rateLimit:jest.fn()}));
const id='00000000-0000-4000-8000-000000000930',key='00000000-0000-4000-8000-000000000931',ctx={params:Promise.resolve({id})};
const send={confirmed:true,hash:'a'.repeat(64),request_key:key,reason:'Customer update'};
function request(b:unknown){return new Request('https://shop.example/api/admin/crm/notifications/'+id+'/email',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json'},body:JSON.stringify(b)});}
beforeEach(()=>{process.env.NEXT_PUBLIC_SUPABASE_URL='https://db.example';process.env.SUPABASE_SERVICE_ROLE_KEY='fake-server-key';jest.clearAllMocks();jest.mocked(crmStaff).mockResolvedValue({id:'admin',role:'admin',email:''});jest.mocked(opsStaff).mockResolvedValue({id:'admin',role:'admin',email:''});jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:{origin:'https://shop.example',payload:{recipient:'verified@example.invalid'},hash:'a'.repeat(64),delivery:{state:'queued'}},error:null} as never);});
afterEach(()=>{jest.restoreAllMocks();delete process.env.NEXT_PUBLIC_SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;});
test('canonical account recipient and safe login link only in preview',async()=>{
 const r=await GET(new Request('https://shop.example'),ctx),b=await r.json();expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');expect(b.recipient).toBe('verified@example.invalid');expect(b.link).toBe('https://shop.example/account');expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_mail_prepare',{p_actor:'admin',p_id:id,p_action:'preview'});
 expect(b.text).not.toMatch(/signed|token=|amount|price_source/);
});
test.each([{confirmed:false},{hash:'z'.repeat(64)},{hash:'a'.repeat(63)},{request_key:'bad'},{reason:''}])('invalid or unconfirmed send rejected %j',patch=>expect(()=>parseMailSend({...send,...patch})).toThrow(ApiError));
test('client recipient, html, actor and arbitrary URL never enter relay payload',async()=>{
 const fetcher=jest.spyOn(global,'fetch').mockResolvedValue(new Response(JSON.stringify({success:true,delivery:{state:'accepted'}}),{status:200}));
 const r=await POST(request({...send,actor:'other',recipient:'evil@example.invalid',html:'<script>',url:'https://evil.example'}),ctx);expect(r.status).toBe(200);
 const payload=JSON.parse(String(fetcher.mock.calls[0][1]?.body));expect(payload).toEqual({actor:'admin',action:'send',id,hash:send.hash,request_key:key,reason:send.reason});
});
test('failed transport never exposes provider error, authorization headers or key',async()=>{
 jest.spyOn(global,'fetch').mockResolvedValue(new Response(JSON.stringify({error:'private password token provider response'}),{status:503}));
 await expect(callMailRelay('admin','send')).rejects.toMatchObject({status:503});const r=await POST(request(send),ctx);expect(JSON.stringify(await r.json())).not.toContain('private password');
});
test('timeout is uncertain and no automatic second SMTP request happens',async()=>{
 const f=jest.spyOn(global,'fetch').mockRejectedValue(Error('socket dropped with private values'));await expect(callMailRelay('admin','send')).rejects.toMatchObject({status:503});expect(f).toHaveBeenCalledTimes(1);
});
test('anonymous denies preview/send before touching records',async()=>{
 jest.mocked(crmStaff).mockRejectedValue(new ApiError(403,'denied'));expect((await GET(new Request('https://shop.example'),ctx)).status).toBe(403);expect((await POST(request(send),ctx)).status).toBe(403);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
test('manual reset requires admin, confirmation and meaningful review reason',async()=>{
 jest.mocked(crmStaff).mockResolvedValue({id:'staff',role:'inquiry_staff',email:''});expect((await POST(request({action:'reset',confirmed:true,reason:'SMTP check completed'}),ctx)).status).toBe(403);
 jest.mocked(crmStaff).mockResolvedValue({id:'admin',role:'admin',email:''});expect((await POST(request({action:'reset',confirmed:true,reason:'short'}),ctx)).status).toBe(400);
 expect((await POST(request({action:'reset',confirmed:true,reason:'Checked Gmail sent folder and recipient'}),ctx)).status).toBe(200);expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_mail_prepare',expect.objectContaining({p_actor:'admin',p_action:'reset'}));
});
test('SMTP verify has staff role check and separate limit',async()=>{
 const f=jest.spyOn(global,'fetch').mockResolvedValue(new Response(JSON.stringify({success:true}),{status:200}));expect((await verify(new Request('https://shop.example',{method:'POST'}))).status).toBe(200);expect(rateLimit).toHaveBeenCalledWith(expect.anything(),'mail-verify',3,900,'admin');expect(JSON.parse(String(f.mock.calls[0][1]?.body))).toEqual({actor:'admin',action:'verify'});
});
test('brand template refuses unsafe origin and never embeds a private document',()=>{
 const message=mailMessage('https://shop.example');expect(message.html).toContain('/logo.png');expect(message.subject).toContain('송영민푸드');expect(message.html).not.toMatch(/<script|storage\/|token=/);
 for(const origin of ['http://shop.example','https://user:pass@shop.example','https://shop.example/?token=1','https://shop.example/private'])expect(()=>mailMessage(origin)).toThrow();
});
test('missing or invalid verified mail origin fails preview closed',async()=>{
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:{origin:'',payload:{recipient:'x'},hash:'a'},error:null} as never);await expect(mailPreview(new Request('https://shop.example'),'admin',id)).rejects.toBeDefined();
});
