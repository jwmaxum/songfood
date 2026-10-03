import { POST as login } from '@/app/api/auth/login/route';
import { POST as confirm } from '@/app/api/payments/confirm/route';
import { createAuthClient, supabaseAdmin } from '@/lib/supabase-admin';
import { createSession } from '@/lib/auth-session';
jest.mock('@/lib/supabase-admin',()=>({
  isAuthConfigured:()=>true,createAuthClient:jest.fn(),
  supabaseAdmin:{rpc:jest.fn(),from:jest.fn()},
}));
jest.mock('@/lib/auth-session',()=>({
  createSession:jest.fn(),
  verifiedUser:(user:{email_confirmed_at?:string}|null)=>!!user?.email_confirmed_at,
}));
const signIn = jest.fn();
beforeEach(()=>{
  jest.clearAllMocks();
  (createAuthClient as jest.Mock).mockReturnValue({auth:{signInWithPassword:signIn}});
  (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({data:true,error:null});
});
const request=(body:object)=>new Request('https://shop.example/api/auth/login',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json'},body:JSON.stringify(body)});
test('bad credentials cannot become a user or create a session',async()=>{
  signIn.mockResolvedValue({data:{user:null},error:{message:'invalid'}});
  expect((await login(request({email:'a@example.com',password:'wrong'}))).status).toBe(401);
  expect(createSession).not.toHaveBeenCalled();
  expect(supabaseAdmin.from).not.toHaveBeenCalled();
});
test('unverified email cannot create a session',async()=>{
  signIn.mockResolvedValue({data:{user:{id:'u'}},error:null});
  expect((await login(request({email:'a@example.com',password:'password'}))).status).toBe(401);
  expect(createSession).not.toHaveBeenCalled();
});
test('forged staff audience without an active staff role fails',async()=>{
  signIn.mockResolvedValue({data:{user:{id:'u',email_confirmed_at:'2026-01-01'}},error:null});
  const q={select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),maybeSingle:jest.fn().mockResolvedValue({data:{role:'viewer',status:'active'},error:null})};
  (supabaseAdmin.from as jest.Mock).mockReturnValue(q);
  expect((await login(request({email:'a@example.com',password:'password',audience:'staff'}))).status).toBe(403);
  expect(createSession).not.toHaveBeenCalled();
});
test('payment confirmation stays disabled even with a configured payment key',async()=>{
  const key=process.env.TOSS_SECRET_KEY; process.env.TOSS_SECRET_KEY='test-server-key';
  try {
    const response=await confirm();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({success:false});
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  } finally { if(key===undefined) delete process.env.TOSS_SECRET_KEY; else process.env.TOSS_SECRET_KEY=key; }
});

test('verified active customer creates a server session after storing and checking the account',async()=>{
  signIn.mockResolvedValue({data:{user:{id:'customer-1',email:'a@example.com',email_confirmed_at:'2026-01-01',user_metadata:{name:'Buyer'}}},error:null});
  const q={upsert:jest.fn().mockResolvedValue({error:null}),select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),single:jest.fn().mockResolvedValue({data:{status:'active'},error:null})};
  (supabaseAdmin.from as jest.Mock).mockReturnValue(q);
  const response = await login(request({email:'a@example.com',password:'correct-password'}));
  expect(response.status).toBe(200);
  expect(createSession).toHaveBeenCalledWith(expect.any(Request),expect.anything(),'customer-1','customer');
  expect(q.upsert).toHaveBeenCalledWith(expect.objectContaining({id:'customer-1',name:'Buyer'}),{onConflict:'id',ignoreDuplicates:true});
});
test('suspended customer never gets a fresh session',async()=>{
  signIn.mockResolvedValue({data:{user:{id:'u',email:'a@example.com',email_confirmed_at:'2026-01-01'}},error:null});
  const q={upsert:jest.fn().mockResolvedValue({error:null}),select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),single:jest.fn().mockResolvedValue({data:{status:'suspended'},error:null})};
  (supabaseAdmin.from as jest.Mock).mockReturnValue(q);
  expect((await login(request({email:'a@example.com',password:'correct-password'}))).status).toBe(403);
  expect(createSession).not.toHaveBeenCalled();
});
