import { ApiError, readJson, requireSameOrigin, rateLimit, failure } from '@/lib/request-security';
import { supabaseAdmin, isAuthConfigured } from '@/lib/supabase-admin';
jest.mock('@/lib/supabase-admin', () => ({ isAuthConfigured: jest.fn(() => true), supabaseAdmin: { rpc: jest.fn() } }));
const rpc = supabaseAdmin.rpc as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); (isAuthConfigured as jest.Mock).mockReturnValue(true); });
test('cookie mutations require same origin, missing and foreign origins fail', () => {
  for (const origin of [undefined,'null','https://evil.example']) {
    const req = new Request('https://shop.example/api/test',{method:'POST',headers:origin?{Origin:origin}:{}});
    expect(() => requireSameOrigin(req)).toThrow(ApiError);
  }
  expect(() => requireSameOrigin(new Request('https://shop.example/api/test',{method:'POST',headers:{Origin:'https://shop.example'}}))).not.toThrow();
});
test('explicit bearer clients may omit origin, but cannot submit a foreign origin', () => {
  expect(() => requireSameOrigin(new Request('https://shop.example/api/test',{headers:{Authorization:'Bearer token'}}),true)).not.toThrow();
  expect(() => requireSameOrigin(new Request('https://shop.example/api/test',{headers:{Authorization:'Bearer token',Origin:'https://evil.example'}}),true)).toThrow();
});
test('JSON parsing rejects malformed bodies and non-object payloads', async () => {
  for(const body of ['{','null','[]','"hello"']) {
    await expect(readJson(new Request('https://shop.example',{method:'POST',headers:{'Content-Type':'application/json'},body}))).rejects.toMatchObject({status:400});
  }
});
test('actual streamed bytes enforce body limit even without Content-Length', async () => {
  const req = new Request('https://shop.example',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({note:'가'.repeat(50)})});
  await expect(readJson(req,64)).rejects.toMatchObject({status:413});
});
test('rate limits fail closed if DB is missing or over quota', async () => {
  rpc.mockResolvedValueOnce({data:false,error:null}).mockResolvedValueOnce({data:null,error:{message:'secret provider detail'}});
  await expect(rateLimit(new Request('https://shop.example'),'login')).rejects.toMatchObject({status:429});
  await expect(rateLimit(new Request('https://shop.example'),'login')).rejects.toMatchObject({status:503});
  (isAuthConfigured as jest.Mock).mockReturnValue(false);
  await expect(rateLimit(new Request('https://shop.example'),'login')).rejects.toMatchObject({status:503});
});
test('rate limiter never stores the raw email or forwarded spoofed address', async () => {
  rpc.mockResolvedValue({data:true,error:null});
  await rateLimit(new Request('https://shop.example',{headers:{'X-Forwarded-For':'1.2.3.4'}}),'login',5,900,'buyer@example.com');
  expect(rpc.mock.calls[0][1].p_key).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(rpc.mock.calls)).not.toContain('buyer@example.com');
});
test('provider details are not returned to clients', async () => {
  const response = failure(new Error('password=private; service_role=private'));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('private');
});

test('configured public origin works behind an internal server URL and rejects a spoofed host', () => {
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = 'https://shop.example';
  try {
    expect(() => requireSameOrigin(new Request('http://internal:3000/api/test',{headers:{Origin:'https://shop.example'}}))).not.toThrow();
    expect(() => requireSameOrigin(new Request('http://internal:3000/api/test',{headers:{Origin:'https://evil.example',Host:'evil.example'}}))).toThrow();
  } finally { if(previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL=previous; }
});
