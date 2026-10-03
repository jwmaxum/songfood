import { NextResponse } from 'next/server';
import { createSession, sessionUser, revokeSession, verifiedUser } from '@/lib/auth-session';
import { supabaseAdmin } from '@/lib/supabase-admin';
jest.mock('@/lib/supabase-admin', () => ({
  isAuthConfigured: () => true,
  supabaseAdmin: { from: jest.fn(), auth: {admin:{getUserById:jest.fn()}} },
}));
const from = supabaseAdmin.from as jest.Mock;
const getUser = supabaseAdmin.auth.admin.getUserById as jest.Mock;
const token = 'a'.repeat(64);
const req = () => new Request('https://shop.example',{headers:{Cookie:'sf_customer_access='+token}});
beforeEach(() => jest.clearAllMocks());
test('creates secure opaque cookie and only stores a hash', async () => {
  const insert = jest.fn().mockResolvedValue({error:null});
  from.mockReturnValue({insert});
  const response = NextResponse.json({success:true});
  await createSession(req(),response,'user-1','customer');
  const cookie = response.cookies.get('sf_customer_access')!.value;
  expect(cookie).toMatch(/^[a-f0-9]{64}$/);
  expect(insert.mock.calls[0][0].token_hash).not.toBe(cookie);
  expect(response.headers.get('set-cookie')).toMatch(/HttpOnly/i);
  expect(response.headers.get('set-cookie')).toMatch(/Secure/i);
  expect(response.headers.get('set-cookie')).toMatch(/SameSite=strict/i);
  expect(insert.mock.calls[0][0].audience).toBe('customer');
});
function sessionRow(data: object | null) {
  const chain = {select:jest.fn(),eq:jest.fn(),maybeSingle:jest.fn().mockResolvedValue({data,error:null})};
  chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); from.mockReturnValue(chain);
  return chain;
}
test('expired and deleted sessions never resolve a user', async () => {
  sessionRow({user_id:'u',expires_at:'2020-01-01T00:00:00Z'});
  expect(await sessionUser(req(),'customer')).toBeNull();
  sessionRow(null);
  expect(await sessionUser(req(),'customer')).toBeNull();
  expect(getUser).not.toHaveBeenCalled();
});
test('audience is checked and banned or unverified users are rejected', async () => {
  const chain = sessionRow({user_id:'u',expires_at:new Date(Date.now()+60000).toISOString()});
  getUser.mockResolvedValue({data:{user:{id:'u',email_confirmed_at:null}},error:null});
  expect(await sessionUser(req(),'customer')).toBeNull();
  expect(chain.eq).toHaveBeenCalledWith('audience','customer');
  getUser.mockResolvedValue({data:{user:{id:'u',email_confirmed_at:'2026-01-01',banned_until:'2099-01-01'}},error:null});
  expect(await sessionUser(req(),'customer')).toBeNull();
  expect(verifiedUser(null)).toBe(false);
});
test('logout revokes server session and reports DB failure truthfully', async () => {
  const eq = jest.fn().mockReturnThis();
  const chain = {delete:jest.fn().mockReturnThis(),eq,then:(resolve: (v:object)=>void)=>resolve({error:null})};
  from.mockReturnValue(chain);
  const response = NextResponse.json({});
  await revokeSession(req(),response,'customer');
  expect(eq).toHaveBeenCalledWith('audience','customer');
  expect(response.cookies.get('sf_customer_access')?.value).toBe('');
  from.mockReturnValue({...chain,then:(resolve:(v:object)=>void)=>resolve({error:{}})});
  await expect(revokeSession(req(),NextResponse.json({}),'customer')).rejects.toMatchObject({status:503});
});
