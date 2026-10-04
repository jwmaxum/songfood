import 'server-only';
import {assertTradeAvailable} from '../launch/repository';
import {supabaseAdmin} from '../supabase-admin';
import {ApiError,digest,uuidField,rateLimit} from '../request-security';
import {crmStaff,databaseError,inquiryById,mutationMeta} from '../crm/repository';
import {requireCustomer,customerInquiries} from '../customer-auth';
import {loadPricingData} from '../pricing/repository';
import {buildPiSnapshot,parseIssue} from './validation';
import type {QuoteDraft} from '../crm/types';
import type {PiDocument,PublicPi} from './types';


import {getPiSettings} from './settings';
const bucket='b2b-proforma';
export async function piAdmin(request:Request){const staff=await crmStaff(request);if(staff.role!=='admin')throw new ApiError(403,'PI 발행·판매자 설정은 관리자 권한이 필요합니다.');return staff;}
export function publicPi(d:PiDocument):PublicPi {
 return {id:d.id,number:d.number,inquiry_id:d.inquiry_id,version:d.version,supersedes_id:d.supersedes_id,snapshot:d.snapshot,status:d.status,issued_at:d.issued_at,accepted_at:d.accepted_at,change_requested_at:d.change_requested_at,pdf_sha256:d.pdf_sha256};
}
export async function documentById(id:string):Promise<PiDocument>{
 const r=await supabaseAdmin.from('b2b_pi_documents').select('*').eq('id',id).maybeSingle();databaseError(r.error);if(!r.data)throw new ApiError(404,'PI를 찾을 수 없습니다.');return r.data;
}
export async function customerDocument(request:Request,id:string){
 const session=await requireCustomer(request),doc=await documentById(id);
 if(doc.status==='preparing'||doc.status==='cancelled')throw new ApiError(404,'PI를 찾을 수 없습니다.');
 await customerInquiries(request,doc.inquiry_id);return {session,doc};
}
export async function piDetail(inquiryId:string,isAdmin:boolean){
 await inquiryById(inquiryId);
 const [rows,settings]=await Promise.all([supabaseAdmin.from('b2b_pi_documents').select('*').eq('inquiry_id',inquiryId).order('version',{ascending:false}).limit(50),
 getPiSettings()]);
 databaseError(rows.error);
 const ids=(rows.data||[]).map(d=>d.id);
 const events=ids.length?await supabaseAdmin.from('b2b_pi_events').select('id,document_id,event,message,created_at').in('document_id',ids).order('created_at',{ascending:false}).limit(200):{data:[],error:null};
 databaseError(events.error);return {documents:rows.data,settings,events:events.data,is_admin:isAdmin};
}
export async function sha256(bytes:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes))),b=>b.toString(16).padStart(2,'0')).join('');}
async function completeDocument(actor:string,doc:PiDocument){
 if(doc.status!=='preparing')return doc;
 const [{renderPiPdf},{loadPiFont}]=await Promise.all([import('./pdf'),import('./font')]);
 const bytes=await renderPiPdf(doc,await loadPiFont()),hash=await sha256(bytes),path='pi/'+doc.id+'.pdf';
 if(bytes.length>10485760)throw new ApiError(422,'PDF 크기가 허용 범위를 넘었습니다.');
 const store=supabaseAdmin.storage.from(bucket);
 const upload=await store.upload(path,bytes,{contentType:'application/pdf',upsert:false});
 // A lost upload response is recoverable only if the stored bytes match this immutable document.
 const stored=await store.download(path);
 if(stored.error||!stored.data)throw new ApiError(503,upload.error?'PDF 저장을 완료하지 못했습니다. 같은 발행 준비를 재시도해 주세요.':'PDF 저장 확인에 실패했습니다.');
 const actual=new Uint8Array(await stored.data.arrayBuffer());
 if(await sha256(actual)!==hash)throw new ApiError(409,'보관된 PDF 해시가 예상 문서와 일치하지 않습니다. 관리자 확인이 필요합니다.');
 const finished=await supabaseAdmin.rpc('b2b_pi_finish',{p_actor:actor,p_id:doc.id,p_path:path,p_sha:hash,p_bytes:actual.length,p_cancel:false});databaseError(finished.error);return finished.data as PiDocument;
}
export async function issuePi(request:Request,actor:string,inquiryId:string,body:Record<string,unknown>){
 if(body.confirmed!==true)throw new ApiError(400,'미리보기 조건 확인 후 발행해 주세요.');
 const meta=mutationMeta(body),quoteId=uuidField(body.quote_id),base=body.base_id?uuidField(body.base_id):null,input=parseIssue(body.input);
 const hash=await digest(JSON.stringify({quoteId,base,input}));
 const old=await supabaseAdmin.from('b2b_pi_documents').select('*').eq('inquiry_id',inquiryId).eq('request_key',meta.key).maybeSingle();databaseError(old.error);
 if(old.data){if(old.data.created_by!==actor||old.data.request_hash!==hash)throw new ApiError(409,'요청 키와 발행 내용이 일치하지 않습니다.');if(old.data.status==='cancelled')throw new ApiError(409,'취소된 발행 준비입니다. 새 요청을 작성해 주세요.');await rateLimit(request,'pi-generate',20,3600,actor);return completeDocument(actor,old.data);}
 await assertTradeAvailable('pi');
 await rateLimit(request,'pi-generate',20,3600,actor);
 const inquiry=await inquiryById(inquiryId);
 // Do not issue company-private documents after the customer's membership is revoked.
 if(inquiry.submitted_by){
  const account=await supabaseAdmin.from('customer_accounts').select('status').eq('id',inquiry.submitted_by).maybeSingle();databaseError(account.error);
  if(account.data?.status!=='active')throw new ApiError(409,'문의 작성자의 활성 계정을 확인해 주세요.');
 }
 if(inquiry.company_id){
  const [c,m]=await Promise.all([supabaseAdmin.from('companies').select('status').eq('id',inquiry.company_id).maybeSingle(),supabaseAdmin.from('company_members').select('status').eq('company_id',inquiry.company_id).eq('user_id',inquiry.submitted_by).maybeSingle()]);
  databaseError(c.error);databaseError(m.error);if(c.data?.status!=='approved'||m.data?.status!=='active')throw new ApiError(409,'문의 회사 소속을 확인해 주세요.');
 }
 const quoteResult=await supabaseAdmin.from('b2b_quote_drafts').select('*').eq('id',quoteId).eq('inquiry_id',inquiryId).maybeSingle();databaseError(quoteResult.error);
 if(!quoteResult.data)throw new ApiError(404,'견적 초안이 없습니다.');const quote=quoteResult.data as QuoteDraft;
 const [prices,r]=await Promise.all([loadPricingData(),supabaseAdmin.from('b2b_exchange_rates').select('*').eq('id',quote.snapshot.exchange_rate?.id||'00000000-0000-0000-0000-000000000000').maybeSingle()]);databaseError(r.error);
 const snapshot=buildPiSnapshot(quote,input,prices.revisions,r.data);
 const result=await supabaseAdmin.rpc('b2b_pi_prepare',{p_actor:actor,p_inquiry:inquiryId,p_quote:quoteId,p_expected:meta.revision,p_base:base,p_key:meta.key,p_hash:hash,p_snapshot:snapshot});databaseError(result.error);
 return completeDocument(actor,result.data);
}
export async function resumePi(request:Request,actor:string,id:string){
 await rateLimit(request,'pi-generate',20,3600,actor);return completeDocument(actor,await documentById(id));
}
export async function customerAction(request:Request,id:string,body:Record<string,unknown>){
 const {session}=await customerDocument(request,id),action=String(body.action),key=uuidField(body.request_key);
 if(!['accept','request_changes','view','download'].includes(action))throw new ApiError(400,'작업을 확인해 주세요.');
 const message=typeof body.message==='string'?body.message.trim():'';
 if(action==='request_changes'&&(message.length<10||message.length>2000))throw new ApiError(400,'수정 요청 내용을 10~2,000자로 입력해 주세요.');
 if(action==='accept'&&body.confirmed!==true)throw new ApiError(400,'PI 조건 확인과 수락 동의가 필요합니다.');
 const r=await supabaseAdmin.rpc('b2b_pi_customer_action',{p_actor:session.user.id,p_id:id,p_action:action,p_message:message,p_key:key,p_hash:await digest(JSON.stringify({action,message}))});databaseError(r.error);return publicPi(r.data);
}
export async function downloadPi(doc:PiDocument){
 if(!doc.pdf_path||!['issued','superseded'].includes(doc.status))throw new ApiError(409,'발행이 완료된 PDF가 없습니다.');
 const r=await supabaseAdmin.storage.from(bucket).download(doc.pdf_path);if(r.error||!r.data)throw new ApiError(503,'PDF를 읽지 못했습니다.');
 const bytes=new Uint8Array(await r.data.arrayBuffer());
 if(bytes.length!==doc.pdf_bytes||await sha256(bytes)!==doc.pdf_sha256)throw new ApiError(409,'PDF 무결성 확인에 실패했습니다.');
 return new Response(bytes,{headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store','Content-Disposition':'attachment; filename="'+doc.number+'-v'+doc.version+'.pdf"','X-Content-Type-Options':'nosniff'}});
}

export async function previewPi(inquiryId:string,body:Record<string,unknown>){
 const input=parseIssue(body.input),id=uuidField(body.quote_id);
 const q=await supabaseAdmin.from('b2b_quote_drafts').select('*').eq('id',id).eq('inquiry_id',inquiryId).maybeSingle();databaseError(q.error);if(!q.data)throw new ApiError(404,'견적 초안이 없습니다.');
 const [pricing,rate]=await Promise.all([loadPricingData(),supabaseAdmin.from('b2b_exchange_rates').select('*').eq('id',q.data.snapshot.exchange_rate?.id||'00000000-0000-0000-0000-000000000000').maybeSingle()]);databaseError(rate.error);
 return buildPiSnapshot(q.data,input,pricing.revisions,rate.data);
}
