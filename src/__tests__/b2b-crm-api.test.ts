jest.mock('@/lib/launch/repository',()=>({assertTradeAvailable:jest.fn()}));
import {POST} from '@/app/api/commercial-inquiries/route';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {cookieToken} from '@/lib/auth-session';
import {requireCustomer} from '@/lib/customer-auth';
import {getProducts} from '@/lib/products-db';
import {rateLimit,digest} from '@/lib/request-security';
import {parseCommercialInquiry,inquiryFingerprint} from '@/lib/commercial-inquiry';
import {parseReview} from '@/lib/crm/quote';
import {crmStaff,saveQuote} from '@/lib/crm/repository';
import {getStaffIdentity} from '@/lib/admin-auth';
import {loadPricingData,selectPrice} from '@/lib/pricing/repository';
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{from:jest.fn(),rpc:jest.fn()},isAuthConfigured:()=>true}));
jest.mock('@/lib/auth-session',()=>({cookieToken:jest.fn()}));
jest.mock('@/lib/customer-auth',()=>({requireCustomer:jest.fn(),assertApproved:jest.fn(()=> 'server-company')}));
jest.mock('@/lib/admin-auth',()=>({requireStaff:jest.fn(),getStaffIdentity:jest.fn()}));
jest.mock('@/lib/products-db',()=>({getProducts:jest.fn()}));
jest.mock('@/lib/pricing/repository',()=>({loadPricingData:jest.fn(),selectPrice:jest.fn()}));
jest.mock('@/lib/request-security',()=>({...jest.requireActual('@/lib/request-security'),rateLimit:jest.fn()}));
const body={kind:'export_rfq',contact_name:'Buyer',email:'buyer@example.com',country:'Japan',incoterms:'FOB',items:[{product_id:'p1',product_name:'Spoofed',quantity_cartons:3}]};
const key='00000000-0000-4000-8000-000000000401';
const request=(payload:object=body,origin='https://shop.example',requestKey:string|null=key)=>new Request('https://shop.example/api/commercial-inquiries',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(requestKey?{'Idempotency-Key':requestKey}:{})},body:JSON.stringify(payload)});
function chain(data:unknown,error:unknown=null){const q={select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),maybeSingle:jest.fn(async()=>({data,error}))};return q;}
beforeEach(()=>{jest.clearAllMocks();(cookieToken as jest.Mock).mockReturnValue(null);(supabaseAdmin.from as jest.Mock).mockReturnValue(chain(null));(supabaseAdmin.rpc as jest.Mock).mockResolvedValue({data:{id:'saved-id',replayed:false},error:null});(getProducts as jest.Mock).mockResolvedValue([{id:'p1',name:'Server name'}]);});
test('only canonical products and authenticated ownership reach the transactional RPC',async()=>{
 (cookieToken as jest.Mock).mockReturnValue('session');(requireCustomer as jest.Mock).mockResolvedValue({user:{id:'server-user'},company:{id:'server-company'}});
 expect((await POST(request({...body,company_id:'spoofed',submitted_by:'spoofed',status:'closed',price:1}))).status).toBe(201);
 expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_submit_inquiry',expect.objectContaining({p_key:key,p_data:expect.objectContaining({company_id:'server-company',submitted_by:'server-user',items:[{product_id:'p1',product_name:'Server name',quantity_cartons:3}]})}));
});
test('same request replay returns saved receipt before products and rate limits',async()=>{
 (cookieToken as jest.Mock).mockReturnValue(null);
 const hash=await digest(inquiryFingerprint(parseCommercialInquiry(body)));
 (supabaseAdmin.from as jest.Mock).mockReturnValue(chain({inquiry_id:'same-id',request_hash:hash}));
 const response=await POST(request());expect(response.status).toBe(200);expect(await response.json()).toMatchObject({id:'same-id',replayed:true});
 expect(getProducts).not.toHaveBeenCalled();expect(rateLimit).not.toHaveBeenCalled();expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
test('different payload under same key is conflict and never saved',async()=>{
 (supabaseAdmin.from as jest.Mock).mockReturnValue(chain({inquiry_id:'same-id',request_hash:'different'}));
 expect((await POST(request())).status).toBe(409);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
test('invalid fields, missing key, foreign origin and absent products cannot create records',async()=>{
 (cookieToken as jest.Mock).mockReturnValue(null);
 expect((await POST(request(body,'https://evil.example'))).status).toBe(403);
 expect((await POST(request(body,'https://shop.example',null))).status).toBe(400);
 const invalid=await POST(request({...body,email:'wrong'}));expect(invalid.status).toBe(400);expect(await invalid.json()).toHaveProperty('fields.email');
 (getProducts as jest.Mock).mockResolvedValue([]);expect((await POST(request())).status).toBe(400);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
test('RPC races return replay and errors do not expose database details',async()=>{
 (cookieToken as jest.Mock).mockReturnValue(null);
 (supabaseAdmin.rpc as jest.Mock).mockResolvedValueOnce({data:{id:'same-id',replayed:true},error:null});
 expect((await POST(request())).status).toBe(200);
 (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({data:null,error:{code:'XX000',message:'private database details'}});
 const r=await POST(request());expect(r.status).toBe(503);expect(JSON.stringify(await r.json())).not.toContain('private database');
});
test('CRM mutations require staff role and same origin',async()=>{
 (getStaffIdentity as jest.Mock).mockResolvedValue({id:'staff',role:'product_staff'});
 await expect(crmStaff(new Request('https://shop.example/api/admin/crm'))).rejects.toMatchObject({status:403});
 (getStaffIdentity as jest.Mock).mockResolvedValue({id:'staff',role:'inquiry_staff'});
 await expect(crmStaff(request(body,'https://evil.example'))).rejects.toMatchObject({status:403});
 await expect(crmStaff(request())).resolves.toMatchObject({id:'staff'});
});
test('saved quote replays before current account or expired price loading',async()=>{
 const review={stock_status:'unreviewed',documents_status:'unreviewed',lead_time_note:'',review_note:'',change_reason:'Review initial',consultation_status:'not_required',consultation_note:'',adjustments:[]};
 const hash=await digest(JSON.stringify({base:null,review:parseReview(review)}));
 const saved={id:'quote',created_by:'staff',request_hash:hash};
 (supabaseAdmin.from as jest.Mock).mockReturnValue(chain(saved));
 await expect(saveQuote('staff','inquiry',{request_key:key,revision:1,base_id:null,review})).resolves.toEqual(saved);
 expect(loadPricingData).not.toHaveBeenCalled();expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});

const reviewInput={stock_status:'unreviewed',documents_status:'unreviewed',lead_time_note:'',review_note:'',change_reason:'Initial review',consultation_status:'not_required',consultation_note:'',adjustments:[]};
test.each([false,true])('quote price scope comes from buyer ownership (company: %s), never employee',async company=>{
 const inquiry={...parseCommercialInquiry(body),id:'inquiry',submitted_by:company?'buyer-id':null,company_id:company?'buyer-company':null,revision:1};
 const tables:Record<string,unknown>={commercial_inquiries:inquiry,customer_accounts:{status:'active'},companies:{id:'buyer-company',status:'approved'},company_members:{company_id:'buyer-company',role:'owner',status:'active'}};
 (supabaseAdmin.from as jest.Mock).mockImplementation(table=>chain(tables[table]||null));
 const lists=[{id:'common-list',scope:'common'},{id:'company-list',scope:'company'}];
 (loadPricingData as jest.Mock).mockResolvedValue({lists,revisions:[],rate:null});(selectPrice as jest.Mock).mockReturnValue(null);
 await saveQuote('employee-id','inquiry',{request_key:key,revision:1,review:reviewInput});
 expect(selectPrice).toHaveBeenCalledWith('p1',expect.objectContaining({user:expect.objectContaining({id:company?'buyer-id':'guest'})}),company?lists:[lists[0]],[]);
 expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_save_quote_draft',expect.objectContaining({p_actor:'employee-id',p_snapshot:expect.objectContaining({base_total_minor:null})}));
});
test('blocked buyer membership prevents a new company quote',async()=>{
 const tables:Record<string,unknown>={commercial_inquiries:{...parseCommercialInquiry(body),id:'inquiry',submitted_by:'buyer',company_id:'company'},customer_accounts:{status:'active'},companies:{status:'approved'},company_members:{status:'suspended'}};
 (supabaseAdmin.from as jest.Mock).mockImplementation(table=>chain(tables[table]||null));
 await expect(saveQuote('employee','inquiry',{request_key:key,revision:1,review:reviewInput})).rejects.toMatchObject({status:409});
 expect(loadPricingData).not.toHaveBeenCalled();expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
