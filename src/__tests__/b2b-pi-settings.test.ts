import {GET,PUT} from '@/app/api/admin/pi/settings/route';
import {getStaffIdentity} from '@/lib/admin-auth';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {rateLimit} from '@/lib/request-security';
import {input} from './fixtures/pi';
jest.mock('@/lib/admin-auth',()=>({getStaffIdentity:jest.fn()}));
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{from:jest.fn(),rpc:jest.fn()},isAuthConfigured:()=>true}));
jest.mock('@/lib/request-security',()=>({...jest.requireActual('@/lib/request-security'),rateLimit:jest.fn()}));
const url='http://localhost:3000/api/admin/pi/settings';
const data={revision:3,data:input.seller};
const chain=()=>({select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),maybeSingle:jest.fn().mockResolvedValue({data,error:null})});
function req(body:unknown={revision:3,seller:input.seller},origin='http://localhost:3000'){return new Request(url,{method:'PUT',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});}
beforeEach(()=>{jest.clearAllMocks();process.env.NEXT_PUBLIC_APP_URL='http://localhost:3000';jest.mocked(getStaffIdentity).mockResolvedValue({id:'admin',role:'admin',email:'test@example.invalid'});jest.mocked(supabaseAdmin.from).mockReturnValue(chain() as never);jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:{...data,revision:4,id:true,updated_by:'private'},error:null} as never);});
test.each([null,'customer','product_staff','inquiry_staff','order_staff'])('PI sender settings deny %s before private database read/write',async role=>{jest.mocked(getStaffIdentity).mockResolvedValue(role?{id:'other',role,email:''} as never:null);expect((await GET(new Request(url))).status).toBe(403);expect((await PUT(req())).status).toBe(403);expect(supabaseAdmin.from).not.toHaveBeenCalled();expect(supabaseAdmin.rpc).not.toHaveBeenCalled();});
test('read/write need no RFQ and bind current actor with no-store and sanitized result',async()=>{
 const read=await GET(new Request(url));expect(read.status).toBe(200);expect(read.headers.get('cache-control')).toBe('no-store');expect(await read.json()).toEqual({settings:data});expect(supabaseAdmin.from).toHaveBeenCalledWith('b2b_pi_settings');
 const write=await PUT(req());expect(write.status).toBe(200);expect(await write.json()).toEqual({success:true,settings:{...data,revision:4}});expect(rateLimit).toHaveBeenCalledWith(expect.any(Request),'pi-seller-settings',20,900,'admin');expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_pi_save_settings',{p_actor:'admin',p_expected:3,p_data:input.seller});expect(write.headers.get('cache-control')).toBe('no-store');
});
test('cross-origin save rejects before write',async()=>{expect((await PUT(req(undefined,'https://evil.invalid'))).status).toBe(403);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();});
test.each([{revision:-1},{revision:1.1},{revision:2147483647},{revision:'3'},{actor_id:'spoofed'},{seller:[]},{seller:{...input.seller,extra:'spoofed'}},{seller:{...input.seller,email:'bad'}},{seller:{...input.seller,name:'x'.repeat(201)}}])('strict settings rejects invalid body %j',async patch=>{expect((await PUT(req({revision:3,seller:input.seller,...patch}))).status).toBe(400);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();});
test('stale write returns 409; provider failure hides bank and internal values',async()=>{
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({error:{code:'40001',message:'private bank secret'}} as never);expect((await PUT(req())).status).toBe(409);
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({error:{code:'other',message:'private bank secret'}} as never);const r=await PUT(req());expect(r.status).toBe(503);expect(await r.text()).not.toContain('private bank');
 jest.mocked(supabaseAdmin.from).mockReturnValue({...chain(),maybeSingle:jest.fn().mockResolvedValue({data:null,error:{code:'other',message:'private bank secret'}})} as never);const read=await GET(new Request(url));expect(read.status).toBe(503);expect(await read.text()).not.toContain('private bank');
});
test('empty settings is explicit null and failed save is never reported as success',async()=>{
 jest.mocked(supabaseAdmin.from).mockReturnValue({...chain(),maybeSingle:jest.fn().mockResolvedValue({data:null,error:null})} as never);expect(await(await GET(new Request(url))).json()).toEqual({settings:null});
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:null,error:null} as never);expect((await PUT(req())).status).toBe(503);
});
test('rate protection failure prevents configuration mutation',async()=>{jest.mocked(rateLimit).mockRejectedValueOnce(new Error('private rate service'));expect((await PUT(req())).status).toBe(503);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();});
