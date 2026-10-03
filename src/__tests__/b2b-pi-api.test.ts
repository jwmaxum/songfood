import {piAdmin,publicPi,customerDocument,issuePi,downloadPi} from '@/lib/pi/repository';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {crmStaff} from '@/lib/crm/repository';
import {requireCustomer,customerInquiries} from '@/lib/customer-auth';
import {rateLimit,digest,ApiError} from '@/lib/request-security';
import {parseIssue} from '@/lib/pi/validation';
import {sample,input} from './fixtures/pi';
import type {PiDocument} from '@/lib/pi/types';
import {GET as listPi} from '@/app/api/account/pi/route';
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{from:jest.fn(),rpc:jest.fn(),storage:{from:jest.fn()}},isAuthConfigured:()=>true}));
jest.mock('@/lib/crm/repository',()=>({...jest.requireActual('@/lib/crm/repository'),crmStaff:jest.fn(),inquiryById:jest.fn()}));
jest.mock('@/lib/customer-auth',()=>({requireCustomer:jest.fn(),customerInquiries:jest.fn()}));
jest.mock('@/lib/request-security',()=>({...jest.requireActual('@/lib/request-security'),rateLimit:jest.fn()}));
jest.mock('@/lib/pi/font',()=>({loadPiFont:jest.fn()}));
jest.mock('@/lib/pi/pdf',()=>({renderPiPdf:jest.fn()}));
function chain(data:unknown){return{select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),in:jest.fn().mockReturnThis(),order:jest.fn().mockReturnThis(),limit:jest.fn(async()=>({data,error:null})),maybeSingle:jest.fn(async()=>({data,error:null}))};}
const doc={...sample(),inquiry_id:'inquiry',quote_id:'00000000-0000-4000-8000-000000000504',supersedes_id:null,status:'issued',issued_at:'2026-10-03',accepted_at:null,change_requested_at:null,pdf_path:'private/file.pdf',pdf_sha256:'hash',pdf_bytes:3,created_by:'admin',request_key:'00000000-0000-4000-8000-000000000507',request_hash:'hash'} as PiDocument;
const request=new Request('http://localhost/api/admin/pi');
beforeEach(()=>{jest.clearAllMocks();(requireCustomer as jest.Mock).mockResolvedValue({user:{id:'buyer'}});(customerInquiries as jest.Mock).mockResolvedValue([{id:'inquiry'}]);(supabaseAdmin.from as jest.Mock).mockReturnValue(chain(doc));});
test('inquiry_staff can inspect CRM but cannot issue PI',async()=>{(crmStaff as jest.Mock).mockResolvedValue({id:'staff',role:'inquiry_staff'});await expect(piAdmin(request)).rejects.toMatchObject({status:403});(crmStaff as jest.Mock).mockResolvedValue({id:'admin',role:'admin'});await expect(piAdmin(request)).resolves.toMatchObject({id:'admin'});});
test('public document contains no storage path, staff identity, key or source quote id',()=>{const d=publicPi(doc);for(const k of ['created_by','pdf_path','request_hash','request_key','quote_id'])expect(d).not.toHaveProperty(k);expect(d.pdf_sha256).toBe('hash');});
test('document reads enforce current inquiry ownership and hide preparing files',async()=>{
 (customerInquiries as jest.Mock).mockRejectedValueOnce(new ApiError(404,'Not found'));await expect(customerDocument(request,doc.id)).rejects.toMatchObject({status:404});
 (supabaseAdmin.from as jest.Mock).mockReturnValue(chain({...doc,status:'preparing'}));await expect(customerDocument(request,doc.id)).rejects.toMatchObject({status:404});
});
test('customer list scopes issued documents to authorized inquiries and strips private fields',async()=>{
 const q=chain([doc]);(supabaseAdmin.from as jest.Mock).mockReturnValue(q);
 const response=await listPi(request),body=await response.json();expect(response.status).toBe(200);expect(q.in).toHaveBeenCalledWith('inquiry_id',['inquiry']);expect(q.in).toHaveBeenCalledWith('status',['issued','superseded']);expect(body.documents[0]).not.toHaveProperty('pdf_path');
});
test('same issued request replays after validity expires without recreating PDF or changing numbering',async()=>{
 const body={quote_id:doc.quote_id,base_id:null,revision:1,input,confirmed:true,request_key:doc.request_key};
 const hash=await digest(JSON.stringify({quoteId:doc.quote_id,base:null,input:parseIssue(input)}));
 (supabaseAdmin.from as jest.Mock).mockReturnValue(chain({...doc,request_hash:hash}));
 await expect(issuePi(request,'admin','inquiry',body)).resolves.toMatchObject({id:doc.id,number:doc.number});
 expect(supabaseAdmin.rpc).not.toHaveBeenCalled();expect(rateLimit).toHaveBeenCalled();
 await expect(issuePi(request,'other','inquiry',body)).rejects.toMatchObject({status:409});
});
test('PDF download fails closed on hash mismatch and sends private no-store on verified bytes',async()=>{
 const bytes=new Uint8Array([1,2,3]);(supabaseAdmin.storage.from as jest.Mock).mockReturnValue({download:jest.fn(async()=>({data:new Blob([bytes]),error:null}))});
 await expect(downloadPi(doc)).rejects.toMatchObject({status:409});
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const response=await downloadPi({...doc,pdf_sha256:hash});expect(response.headers.get('Cache-Control')).toBe('private, no-store');expect(response.headers.get('Content-Disposition')).toContain('attachment');expect(response.headers.get('Content-Type')).toBe('application/pdf');
});
