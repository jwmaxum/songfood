import { POST as emailLink } from '@/app/api/auth/email/route';
import { POST as verify } from '@/app/api/auth/verify/route';
import { POST as signup } from '@/app/api/auth/signup/route';
import { createAuthClient, supabaseAdmin } from '@/lib/supabase-admin';
import { createSession } from '@/lib/auth-session';
import { parseCommercialInquiry } from '@/lib/commercial-inquiry';
jest.mock('@/lib/supabase-admin',()=>({
  isAuthConfigured:()=>true, createAuthClient:jest.fn(),
  supabaseAdmin:{rpc:jest.fn(),from:jest.fn()},
}));
jest.mock('@/lib/auth-session',()=>({
  createSession:jest.fn(),verifiedUser:(user:{email_confirmed_at?:string}|null)=>!!user?.email_confirmed_at,
}));
const signInWithOtp=jest.fn(),getUser=jest.fn();
const req=(path:string,body:object,origin='https://shop.example')=>new Request('https://shop.example'+path,{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body),
});
beforeEach(()=>{
  jest.clearAllMocks();
  (createAuthClient as jest.Mock).mockReturnValue({auth:{signInWithOtp,getUser}});
  (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({data:true,error:null});
  signInWithOtp.mockResolvedValue({error:null});
});
test('email-only signup needs no name, password, company or registration number',async()=>{
  expect((await signup(req('/api/auth/signup',{email:'buyer@example.com'}))).status).toBe(202);
  expect(signInWithOtp).toHaveBeenCalledWith({email:'buyer@example.com',options:{
    shouldCreateUser:true,emailRedirectTo:'https://shop.example/account/confirmed',
  }});
  expect(createSession).not.toHaveBeenCalled();
});
test('invalid email and foreign origin never trigger email delivery',async()=>{
  expect((await emailLink(req('/api/auth/email',{email:'invalid'}))).status).toBe(400);
  expect((await emailLink(req('/api/auth/email',{email:'buyer@example.com'},'https://evil.example'))).status).toBe(403);
  expect(signInWithOtp).not.toHaveBeenCalled();
});
test('provider mail failure is not reported as successful signup',async()=>{
  signInWithOtp.mockResolvedValue({error:{status:422,message:'private SMTP detail'}});
  const result=await emailLink(req('/api/auth/email',{email:'buyer@example.com'}));
  expect(result.status).toBe(503);
  expect(JSON.stringify(await result.json())).not.toContain('private SMTP detail');
});
test('rate limited address never contacts email provider',async()=>{
  (supabaseAdmin.rpc as jest.Mock).mockResolvedValueOnce({data:true,error:null}).mockResolvedValueOnce({data:false,error:null});
  expect((await emailLink(req('/api/auth/email',{email:'buyer@example.com'}))).status).toBe(429);
  expect(signInWithOtp).not.toHaveBeenCalled();
});
test.each([null,{id:'u',email:'buyer@example.com'}])('invalid or unverified callback cannot create session: %p',async user=>{
  getUser.mockResolvedValue({data:{user},error:null});
  expect((await verify(req('/api/auth/verify',{accessToken:'not-a-real-token-1234567890'}))).status).toBe(401);
  expect(createSession).not.toHaveBeenCalled();
});
test('verified customer activates immediately without company and cannot claim staff audience',async()=>{
  getUser.mockResolvedValue({data:{user:{id:'customer',email:'buyer@example.com',email_confirmed_at:'2026-01-01',user_metadata:{}}},error:null});
  const q={upsert:jest.fn().mockResolvedValue({error:null}),select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),single:jest.fn().mockResolvedValue({data:{status:'active'},error:null})};
  (supabaseAdmin.from as jest.Mock).mockReturnValue(q);
  expect((await verify(req('/api/auth/verify',{accessToken:'not-a-real-token-1234567890',audience:'staff',role:'admin',companyId:'fake'}))).status).toBe(200);
  expect(createSession).toHaveBeenCalledWith(expect.any(Request),expect.anything(),'customer','customer');
  expect(q.upsert).toHaveBeenCalledWith({id:'customer',email:'buyer@example.com',name:'buyer'},{onConflict:'id',ignoreDuplicates:true});
});
test('personal bulk inquiry accepts no company and no business number',()=>{
  expect(parseCommercialInquiry({kind:'domestic_wholesale',contact_name:'개인 구매자',email:'buyer@example.com',phone:'01012345678'}))
    .toMatchObject({company:'개인 구매',business_registration_no:null});
});
