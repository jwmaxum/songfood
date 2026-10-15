import {POST} from '@/app/api/admin/catalogue/pdf/route';
import {getStaffIdentity} from '@/lib/admin-auth';
import {getBusinessSettings} from '@/lib/business-settings-server';
import {initialBusinessProfile} from '@/lib/business-settings';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {loadPiFont} from '@/lib/pi/font';
import {CATALOGUE_PRODUCT_FIELDS, MAX_CATALOGUE_PRODUCTS} from '@/lib/catalogue/types';

jest.mock('@/lib/admin-auth',()=>({getStaffIdentity:jest.fn()}));
jest.mock('@/lib/business-settings-server',()=>({getBusinessSettings:jest.fn()}));
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{from:jest.fn(),rpc:jest.fn()},isAuthConfigured:()=>true}));
jest.mock('@/lib/pi/font',()=>({loadPiFont:jest.fn(()=>{throw new Error('Font unavailable in Worker');})}));

const actor={id:'00000000-0000-4000-8000-000000000851',email:'catalogue@example.invalid',role:'admin' as const};
const origin='https://shop.example';
const fixtureDate='2026-10-15T04:00:00.000Z';
const query={select:jest.fn(),in:jest.fn()};
const valid={product_ids:['prod-alpha'],language:'ko'};
const alpha={id:'prod-alpha',name:'상품 갑',name_en:'Product Alpha',sku:'CAT-ALPHA',collection:'HMR',category:'Dumpling',brand:'Bibigo',manufacturer:'',country_of_origin:null,origin:'',net_weight:'500g',package_size:'',format:'',shelf_life:'',storage:null,image_url:'/images/coming-soon.png'};
const beta={...alpha,id:'prod-beta',name:'상품 을',name_en:'Product Beta',sku:'CAT-BETA'};
const savedOrigin=process.env.NEXT_PUBLIC_APP_URL;
function request(body:unknown=valid,headers:Record<string,string>={}){
 return new Request(origin+'/api/admin/catalogue/pdf',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
}
function expectNoDataAccess(){expect(supabaseAdmin.from).not.toHaveBeenCalled();expect(supabaseAdmin.rpc).not.toHaveBeenCalled();expect(getBusinessSettings).not.toHaveBeenCalled();}

beforeEach(()=>{
 jest.clearAllMocks();jest.useFakeTimers({now:new Date(fixtureDate)});process.env.NEXT_PUBLIC_APP_URL=origin;
 jest.mocked(getStaffIdentity).mockResolvedValue(actor);
 jest.mocked(getBusinessSettings).mockResolvedValue({profile:{...initialBusinessProfile,name:'송영민푸드 QA',email:'contact@example.invalid',phone:'010-1111-2222',export_phone:'+82-10-3333-4444',owner:'PRIVATE OWNER',registration:'PRIVATE REGISTRATION',privacy_contact:'PRIVATE PRIVACY CONTACT'},revision:3,updated_at:fixtureDate});
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:true,error:null} as never);
 jest.mocked(supabaseAdmin.from).mockReturnValue(query as never);query.select.mockReturnValue(query);query.in.mockResolvedValue({data:[alpha],error:null});
});
afterEach(()=>{jest.useRealTimers();});
afterAll(()=>{if(savedOrigin===undefined)delete process.env.NEXT_PUBLIC_APP_URL;else process.env.NEXT_PUBLIC_APP_URL=savedOrigin;});

test('a fresh Korean public snapshot works without any Worker font or PDF rendering dependency',async()=>{
 const response=await POST(request());expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
 expect(response.headers.get('content-type')).toContain('application/json');
 const {success,catalogue}=await response.json();expect(success).toBe(true);
 expect(catalogue).toMatchObject({version:1,language:'ko',generated_at:fixtureDate,filename:'songfood-catalogue-ko-2026-10-15.pdf',site_origin:origin,seller:{name:'송영민푸드 QA',email:'contact@example.invalid',phone:'010-1111-2222',export_phone:'+82-10-3333-4444'}});
 expect(catalogue.products).toEqual([{...alpha,country_of_origin:'',storage:''}]);
 expect(loadPiFont).not.toHaveBeenCalled();expect(supabaseAdmin.from).toHaveBeenCalledWith('products');
 expect(query.select).toHaveBeenCalledWith(CATALOGUE_PRODUCT_FIELDS.join(','));expect(query.in).toHaveBeenCalledWith('id',['prod-alpha']);
 expect(Object.keys(catalogue.seller).sort()).toEqual(['name','email','phone','export_phone'].sort());
});

test.each(['admin','product_staff'] as const)('%s can obtain English catalogue metadata using the verified server identity',async role=>{
 jest.mocked(getStaffIdentity).mockResolvedValue({...actor,role});const response=await POST(request({...valid,language:'en'}));expect(response.status).toBe(200);
 expect((await response.json()).catalogue.filename).toBe('songfood-catalogue-en-2026-10-15.pdf');
 expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_consume_rate_limit',expect.objectContaining({p_limit:10,p_seconds:900}));
});

test.each([null,{...actor,role:'customer'},{...actor,role:'inquiry_staff'},{...actor,role:'order_staff'}])('an anonymous, customer or unrelated staff identity cannot obtain a snapshot %j',async identity=>{
 jest.mocked(getStaffIdentity).mockResolvedValue(identity as Awaited<ReturnType<typeof getStaffIdentity>>);
 const response=await POST(request());expect(response.status).toBe(403);expect(response.headers.get('cache-control')).toBe('no-store');expectNoDataAccess();
});

test('a verified cookie session still rejects a foreign or missing request origin',async()=>{
 const foreign=await POST(request(valid,{Origin:'https://foreign.example'}));expect(foreign.status).toBe(403);
 const missing=new Request(origin+'/api/admin/catalogue/pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(valid)});
 expect((await POST(missing)).status).toBe(403);expect(getStaffIdentity).not.toHaveBeenCalled();expectNoDataAccess();
});

test('a server-authenticated bearer request may omit Origin but cannot bypass role checks',async()=>{
 const bearer=new Request(origin+'/api/admin/catalogue/pdf',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture-not-a-live-token'},body:JSON.stringify(valid)});
 expect((await POST(bearer)).status).toBe(200);expect(getStaffIdentity).toHaveBeenCalledWith(bearer);
});

test.each([
 {product_ids:null,language:'ko'}, {product_ids:'prod-alpha',language:'ko'}, {product_ids:[],language:'ko'},
 {product_ids:[null],language:'ko'}, {product_ids:[1],language:'ko'}, {product_ids:[''],language:'ko'},
 {product_ids:['prod-alpha','prod-alpha'],language:'ko'}, {product_ids:['../private'],language:'ko'},
 {product_ids:['prod alpha'],language:'ko'}, {product_ids:['a'.repeat(101)],language:'ko'},
 {language:'ko'}, {product_ids:['prod-alpha']}, {product_ids:['prod-alpha'],language:'ja'},
 {product_ids:['prod-alpha'],language:['ko']}, {...valid,actor_id:actor.id}, {...valid,price:100},
 {...valid,source_notes:{label:'PRIVATE LABEL'}}, {...valid,url:'https://private.invalid'},
])('invalid or unknown request fields are rejected before rate limiting or data reads %j',async body=>{
 const response=await POST(request(body));expect(response.status).toBe(400);expectNoDataAccess();
});

test('the 500-product ceiling accepts its boundary and rejects 501 without truncation',async()=>{
 const ids=Array.from({length:MAX_CATALOGUE_PRODUCTS},(_,i)=>'prod-'+i);
 query.in.mockResolvedValue({data:ids.map(id=>({...alpha,id})),error:null});
 const accepted=await POST(request({product_ids:ids,language:'en'}));expect(accepted.status).toBe(200);expect((await accepted.json()).catalogue.products).toHaveLength(500);
 jest.clearAllMocks();const rejected=await POST(request({product_ids:[...ids,'prod-500'],language:'en'}));expect(rejected.status).toBe(400);expectNoDataAccess();
});

test('selection order is preserved independently of database row order',async()=>{
 query.in.mockResolvedValue({data:[alpha,beta],error:null});const response=await POST(request({product_ids:['prod-beta','prod-alpha'],language:'en'}));
 expect(response.status).toBe(200);expect((await response.json()).catalogue.products.map((p:{id:string})=>p.id)).toEqual(['prod-beta','prod-alpha']);
});

test('a deleted or unknown selected product causes a safe conflict rather than a partial catalogue',async()=>{
 const response=await POST(request({product_ids:['prod-alpha','prod-deleted'],language:'ko'}));expect(response.status).toBe(409);
 expect(await response.json()).toEqual({success:false,error:expect.any(String)});
});

test('a newly added private database field cannot leak through the catalogue product projection',async()=>{
 const privateText='PRIVATE CATALOGUE SENTINEL';
 query.in.mockResolvedValue({data:[{...alpha,stock:15,price:200,wholesale_price_krw:300,export_price_usd:5,source_notes:{specification:privateText,label:privateText,sales_terms:privateText},base_product:{secret:privateText},created_by:privateText,audit_notes:privateText,bank_details:privateText,ingredients:privateText,certifications:[privateText]}],error:null});
 const response=await POST(request());expect(response.status).toBe(200);const body=await response.json();
 expect(Object.keys(body.catalogue.products[0]).sort()).toEqual([...CATALOGUE_PRODUCT_FIELDS].sort());
 expect(JSON.stringify(body)).not.toContain(privateText);expect(JSON.stringify(body)).not.toContain('PRIVATE OWNER');expect(JSON.stringify(body)).not.toContain('PRIVATE REGISTRATION');
 for(const key of ['stock','price','wholesale_price_krw','export_price_usd','source_notes','base_product','bank_details','created_by'])expect(body.catalogue.products[0]).not.toHaveProperty(key);
});

test('null and malformed optional public values become blank without fabricated claims',async()=>{
 query.in.mockResolvedValue({data:[{...alpha,manufacturer:null,country_of_origin:undefined,storage:17,net_weight:{label:'not a string'},shelf_life:false}],error:null});
 const response=await POST(request());expect(response.status).toBe(200);const {catalogue}=await response.json();
 for(const key of ['manufacturer','country_of_origin','storage','net_weight','shelf_life'])expect(catalogue.products[0][key]).toBe('');
});

test.each([{data:null,error:{message:'PRIVATE DATABASE DETAIL'}},{data:null,error:null}])('database failures return 503 without provider details %j',async result=>{
 query.in.mockResolvedValue(result);const response=await POST(request());expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain('PRIVATE DATABASE DETAIL');
});

test('a thrown connection or business-settings failure does not disclose internals',async()=>{
 jest.mocked(getBusinessSettings).mockRejectedValue(new Error('PRIVATE CONNECTION DETAIL'));
 const response=await POST(request());expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain('PRIVATE CONNECTION DETAIL');
});

test('rate-limit denial and protection failure stop the product and seller reads',async()=>{
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:false,error:null} as never);expect((await POST(request())).status).toBe(429);
 expect(supabaseAdmin.from).not.toHaveBeenCalled();expect(getBusinessSettings).not.toHaveBeenCalled();
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:null,error:{message:'PRIVATE RATE DETAIL'}} as never);const unavailable=await POST(request());expect(unavailable.status).toBe(503);
 expect(JSON.stringify(await unavailable.json())).not.toContain('PRIVATE RATE DETAIL');expect(supabaseAdmin.from).not.toHaveBeenCalled();
});

test('content type, malformed JSON, body shape and byte ceiling fail before data access',async()=>{
 const base={method:'POST',headers:{Origin:origin,'Content-Type':'application/json'}};
 for(const raw of ['{','[]','null','7'])expect((await POST(new Request(origin+'/api/admin/catalogue/pdf',{...base,body:raw}))).status).toBe(400);
 expect((await POST(request(valid,{'Content-Type':'text/plain'}))).status).toBe(415);
 expect((await POST(request({...valid,untrusted:'x'.repeat(65537)}))).status).toBe(413);expectNoDataAccess();
});

test('an unsafe configured origin fails closed without trusting the requested host',async()=>{
 process.env.NEXT_PUBLIC_APP_URL='https://shop.example.evil@invalid.example';
 expect((await POST(request())).status).toBe(403);expectNoDataAccess();
});

test('download filename uses the same Korea date as the document after the UTC date boundary',async()=>{
 jest.setSystemTime(new Date('2026-10-15T16:00:00.000Z'));
 const response=await POST(request());expect(response.status).toBe(200);
 expect((await response.json()).catalogue).toMatchObject({generated_at:'2026-10-15T16:00:00.000Z',filename:'songfood-catalogue-ko-2026-10-16.pdf'});
});
