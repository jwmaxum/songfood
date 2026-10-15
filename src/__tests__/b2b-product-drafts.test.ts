import {GET,POST,PUT} from '@/app/api/admin/product-drafts/route';
import {POST as legacySave} from '@/app/api/products/route';
import {getStaffIdentity,requireStaff} from '@/lib/admin-auth';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {parseDraftData,parseDraftSave} from '@/lib/product-drafts/validation';
import {publicProduct} from '@/lib/public-product';
import type {ProductItem} from '@/lib/types';
import {NextRequest} from 'next/server';
jest.mock('@/lib/admin-auth',()=>({getStaffIdentity:jest.fn(),requireStaff:jest.fn()}));
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{rpc:jest.fn()},isAuthConfigured:()=>true,isSupabaseConfigured:()=>true}));
const actor={id:'00000000-0000-4000-8000-000000000841',email:'qa@example.invalid',role:'admin' as const};
const id='00000000-0000-4000-8000-000000000842';
const draft={id,product_id:null,revision:1,data:{name:'Only a name'},source_notes:{specification:'Private supplier text',label:'',sales_terms:''},base_hash:null,base_product:null,status:'draft'};
const body={product_id:null,revision:0,data:{name:'Only a name'},source_notes:{specification:'Private supplier text'},reason:'담당자 작성 내용 저장'};
const originalOrigin=process.env.NEXT_PUBLIC_APP_URL;
function request(data:unknown,method='POST',origin='https://shop.example'){return new Request('https://shop.example/api/admin/product-drafts',{method,headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)});}
beforeEach(()=>{
 process.env.NEXT_PUBLIC_APP_URL='https://shop.example';jest.clearAllMocks();jest.mocked(getStaffIdentity).mockResolvedValue(actor);jest.mocked(requireStaff).mockResolvedValue(null);
 jest.mocked(supabaseAdmin.rpc).mockImplementation((name:string)=>Promise.resolve({data:name==='b2b_consume_rate_limit'?true:name==='b2b_product_draft_snapshot'?{drafts:[draft]}:name==='b2b_publish_product_draft'?{draft:{...draft,status:'published'},product:{id:'qa-public',name:'Only a name'}}:draft,error:null}) as never);
});
afterAll(()=>{if(originalOrigin===undefined)delete process.env.NEXT_PUBLIC_APP_URL;else process.env.NEXT_PUBLIC_APP_URL=originalOrigin;});
test('partial private save needs no catalogue labels or price and binds the server actor',async()=>{
 const response=await POST(request(body));expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
 expect((await response.json()).draft.source_notes.specification).toBe('Private supplier text');
 expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_save_product_draft',expect.objectContaining({p_actor:actor.id,p_product_id:null,p_revision:0,p_data:{name:'Only a name'},p_source_notes:{specification:'Private supplier text'},p_rebase:false}));
 expect(jest.mocked(supabaseAdmin.rpc).mock.calls.some(([name])=>name==='b2b_publish_product_draft')).toBe(false);
});
test('empty draft and explicit clearing preserve missing versus written values',async()=>{
 expect(parseDraftSave({...body,data:{},source_notes:{}}).data).toEqual({});
 const response=await POST(request({...body,id,revision:1,data:{name_en:'',storage:null,stock:null,certifications:[]},source_notes:{label:''}}));expect(response.status).toBe(200);
 expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_save_product_draft',expect.objectContaining({p_data:{name_en:'',storage:null,stock:null,certifications:[]},p_source_notes:{label:''}}));
});
test('explicit rebase forwards fresh original fingerprint and current revision only',async()=>{
 const response=await POST(request({...body,id,product_id:'prod-existing',revision:4,base_hash:'a'.repeat(64),rebase:true,data:{storage:''}}));expect(response.status).toBe(200);
 expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_save_product_draft',expect.objectContaining({p_actor:actor.id,p_id:id,p_product_id:'prod-existing',p_revision:4,p_base_hash:'a'.repeat(64),p_rebase:true,p_data:{storage:''}}));
});
test.each([null,{...actor,role:'inquiry_staff' as const},{...actor,role:'order_staff' as const}])('unqualified identity cannot read or save drafts %j',async identity=>{
 jest.mocked(getStaffIdentity).mockResolvedValue(identity);expect((await GET(new Request('https://shop.example/api/admin/product-drafts'))).status).toBe(403);expect((await POST(request(body))).status).toBe(403);expect((await PUT(request({id,revision:1,reason:'공개 반영 확인'}))).status).toBe(403);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
test('product staff keeps catalogue authoring rights without release approval',async()=>{
 jest.mocked(getStaffIdentity).mockResolvedValue({...actor,role:'product_staff'});expect((await PUT(request({id,revision:1,reason:'공개 상품 정보 확인'},'PUT'))).status).toBe(200);
 expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_publish_product_draft',{p_actor:actor.id,p_id:id,p_revision:1,p_reason:'공개 상품 정보 확인'});expect(jest.mocked(supabaseAdmin.rpc).mock.calls.some(([name])=>name.includes('release'))).toBe(false);
});
test('foreign origin cannot save or publish with a valid cookie identity',async()=>{
 expect((await POST(request(body,'POST','https://evil.example'))).status).toBe(403);expect((await PUT(request({id,revision:1,reason:'공개 반영 확인'},'PUT','https://evil.example'))).status).toBe(403);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
test.each([{actor_id:'spoofed'},{source_notes:{private_key:'bad'}},{rebase:'true'},{data:{wholesale_price_krw:1}},{data:{id:'spoofed'}},{data:{image_url:'javascript:alert(1)'}},{data:{image_url:'//evil.example/pixel'}},{data:{stock:-1}},{data:{certifications:['x'.repeat(251)]}},{revision:1.5}])('unsafe or unknown input rejected before DB %j',async patch=>{
 const response=await POST(request({...body,...patch}));expect(response.status).toBe(400);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
test('bad content type and oversized body never reach RPC',async()=>{
 const bad=new Request('https://shop.example/api/admin/product-drafts',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'text/plain'},body:'{}'});expect((await POST(bad)).status).toBe(415);
 expect((await POST(request({...body,data:{description:'x'.repeat(140000)}}))).status).toBe(413);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
test('stale draft and unique SKU errors are safe conflicts with no SQL detail',async()=>{
 for(const code of ['40001','23505']){
  jest.mocked(supabaseAdmin.rpc).mockImplementation((name:string)=>Promise.resolve(name==='b2b_consume_rate_limit'?{data:true,error:null}:{data:null,error:{code,message:'PRIVATE SQL DETAIL'}}) as never);
  const response=await POST(request(body));expect(response.status).toBe(409);expect(JSON.stringify(await response.json())).not.toContain('PRIVATE SQL DETAIL');
 }
});
test('read scopes use only validated IDs and source notes stay out of public projection',async()=>{
 expect((await GET(new Request('https://shop.example/api/admin/product-drafts?product_id=prod-existing'))).status).toBe(200);expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_product_draft_snapshot',{p_actor:actor.id,p_id:null,p_product_id:'prod-existing'});
 expect((await GET(new Request('https://shop.example/api/admin/product-drafts?id='+id+'&product_id=prod-existing'))).status).toBe(400);
 expect((await GET(new Request('https://shop.example/api/admin/product-drafts?actor_id=spoofed'))).status).toBe(400);
 expect(publicProduct({id:'x',name:'x',source_notes:{specification:'PRIVATE'},base_product:{}} as unknown as ProductItem)).toEqual({id:'x',name:'x'});
});
test('save and publication have actor rate limits and fail closed when protection fails',async()=>{
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:false,error:null} as never);
 expect((await POST(request(body))).status).toBe(429);expect((await PUT(request({id,revision:1,reason:'공개 반영 확인'},'PUT'))).status).toBe(429);expect(jest.mocked(supabaseAdmin.rpc).mock.calls.every(([name])=>name==='b2b_consume_rate_limit')).toBe(true);
});
test('legacy direct save cannot bypass draft publication and auditing',async()=>{
 const response=await legacySave(new NextRequest('https://shop.example/api/products',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json'},body:'{}'}));
 expect(response.status).toBe(410);expect(await response.json()).toMatchObject({draft_endpoint:'/api/admin/product-drafts'});expect(requireStaff).toHaveBeenCalledWith(expect.anything(),['admin','product_staff']);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
test('non-finite typed values cannot become numeric product data',()=>{for(const value of [NaN,Infinity,-Infinity])expect(()=>parseDraftData({price:value})).toThrow();});

test('English-only and unclassified draft input reaches the guarded save without invented values',async()=>{
 const data={name:null,name_en:'English-only product',sku:'',collection:null,category:null};
 const response=await POST(request({...body,data}));expect(response.status).toBe(200);
 expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_save_product_draft',expect.objectContaining({p_data:data}));
 expect(jest.mocked(supabaseAdmin.rpc).mock.calls.some(([name])=>name==='b2b_publish_product_draft')).toBe(false);
});
test('publication returns only server-assigned identity while preserving missing facts and approvals',async()=>{
 const product={id:'prod-qa-generated',name:null,name_en:'English-only product',sku:'AUTO-'+id,collection:null,category:null};
 jest.mocked(supabaseAdmin.rpc).mockImplementation((name:string)=>Promise.resolve({data:name==='b2b_consume_rate_limit'?true:{draft:{...draft,status:'published'},product},error:null}) as never);
 const response=await PUT(request({id,revision:1,reason:'실제 입력한 이름으로 카탈로그 반영'},'PUT'));
 expect(response.status).toBe(200);expect((await response.json()).product).toEqual(product);
 expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_publish_product_draft',{p_actor:actor.id,p_id:id,p_revision:1,p_reason:'실제 입력한 이름으로 카탈로그 반영'});
 expect(jest.mocked(supabaseAdmin.rpc).mock.calls.map(([name])=>name)).toEqual(['b2b_consume_rate_limit','b2b_publish_product_draft']);
});
test('server validation failures explain one-name minimum without exposing database detail',async()=>{
 jest.mocked(supabaseAdmin.rpc).mockImplementation((name:string)=>Promise.resolve(name==='b2b_consume_rate_limit'?{data:true,error:null}:{data:null,error:{code:'22023',message:'PRIVATE SQL DETAIL'}}) as never);
 const response=await PUT(request({id,revision:1,reason:'카탈로그 반영 확인'},'PUT'));expect(response.status).toBe(400);
 const json=JSON.stringify(await response.json());expect(json).toContain('한국어 또는 영어 상품명');expect(json).toContain('SKU와 분류는 비워 둘 수 있습니다');expect(json).not.toContain('PRIVATE SQL DETAIL');
});
