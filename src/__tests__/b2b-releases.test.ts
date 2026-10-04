import {GET,PUT} from '@/app/api/admin/releases/route';
import {opsStaff} from '@/lib/operations/repository';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {parseRelease} from '@/lib/launch/releases';
import {ApiError} from '@/lib/request-security';
jest.mock('@/lib/operations/repository',()=>({opsStaff:jest.fn()}));
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{rpc:jest.fn()},isAuthConfigured:()=>true}));
const body={product_id:'p1',revision:0,hash:'a'.repeat(64),domestic:true,export:false,reason:'Supplier label and approved price reviewed'};
function request(b:unknown){return new Request('https://shop.example/api/admin/releases',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});}
beforeEach(()=>{jest.clearAllMocks();jest.mocked(opsStaff).mockResolvedValue({id:'admin',role:'admin',email:''});jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:{products:[],policy:{enabled:false,revision:1}},error:null} as never);});
test.each([{revision:-1},{revision:0.5},{domestic:'true'},{export:null},{hash:'z'.repeat(64)},{reason:'short'},{product_id:''}])('invalid release %j',patch=>expect(()=>parseRelease({...body,...patch})).toThrow(ApiError));
test('only server actor and whitelisted review reach SQL',async()=>{
 const r=await PUT(request({...body,actor_id:'spoofed',status:'approved'}));expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_save_release',{p_actor:'admin',p_id:'p1',p_revision:0,p_hash:body.hash,p_domestic:true,p_export:false,p_reason:body.reason});
});
test('stale review produces conflict without disclosing SQL',async()=>{jest.mocked(supabaseAdmin.rpc).mockResolvedValue({error:{code:'40001',message:'internal schema'}} as never);const r=await PUT(request(body));expect(r.status).toBe(409);expect(JSON.stringify(await r.json())).not.toContain('schema');});
test('read is for product staff but all approval and policy changes are admin only',async()=>{
 await GET(new Request('https://shop.example'));expect(opsStaff).toHaveBeenCalledWith(expect.anything(),['admin','product_staff']);
 await PUT(request({action:'policy',revision:1,enabled:true,reason:'Limited launch evidence checked'}));expect(opsStaff).toHaveBeenLastCalledWith(expect.anything(),['admin']);expect(supabaseAdmin.rpc).toHaveBeenLastCalledWith('b2b_set_release_policy',expect.objectContaining({p_enabled:true,p_actor:'admin'}));
});
test('anonymous cannot access the release registry',async()=>{jest.mocked(opsStaff).mockRejectedValue(new ApiError(403,'denied'));expect((await GET(new Request('https://shop.example'))).status).toBe(403);expect((await PUT(request(body))).status).toBe(403);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();});
test('query failure is not an empty successful checklist',async()=>{jest.mocked(supabaseAdmin.rpc).mockResolvedValue({error:{code:'XX000'}} as never);expect((await GET(new Request('https://shop.example'))).status).toBe(503);});
