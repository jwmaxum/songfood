import 'server-only';
import {supabaseAdmin} from '../supabase-admin';
import {getStaffIdentity} from '../admin-auth';
import {ApiError,digest,json,requireSameOrigin,uuidField} from '../request-security';
import {InquiryValidationError,INQUIRY_STATUSES,INQUIRY_STATUS_LABELS} from '../commercial-inquiry';
import {loadPricingData,selectPrice} from '../pricing/repository';
import {PricingError} from '../pricing/validation';
import {getProducts} from '../products-db';
import type {CustomerSession} from '../b2b-types';
import type {PriceRevision} from '../pricing/types';
import type {CrmInquiry,QuoteDraft} from './types';
import {parseReview,buildQuoteSnapshot} from './quote';
export function crmFailure(error:unknown) {
  if(error instanceof InquiryValidationError)return json({success:false,error:error.message,fields:error.fields},400);
  if(error instanceof ApiError)return json({success:false,error:error.message},error.status);
  return json({success:false,error:'문의·견적 서비스에 연결하지 못했습니다. 다시 시도해 주세요.'},503);
}
export function databaseError(error:{code?:string}|null) {
  if(!error)return;
  if(error.code==='23505')throw new ApiError(409,'같은 요청 키에 다른 내용이 있습니다. 새로고침 후 다시 확인해 주세요.');
  if(error.code==='40001')throw new ApiError(409,'다른 담당자가 먼저 변경했습니다. 새로고침 후 최신 내용을 확인해 주세요.');
  if(error.code==='42501')throw new ApiError(403,'직원 또는 회사 권한을 확인해 주세요.');
  if(error.code==='P0002')throw new ApiError(404,'문의를 찾을 수 없습니다.');
  if(error.code==='22023')throw new ApiError(400,'검토 대상 또는 입력값을 다시 확인해 주세요.');
  throw new ApiError(503,'문의·견적 저장에 실패했습니다. 같은 내용으로 다시 시도해 주세요.');
}
export async function crmStaff(request:Request) {
  if(!['GET','HEAD'].includes(request.method))requireSameOrigin(request,true);
  const staff=await getStaffIdentity(request);
  if(!staff||!['admin','inquiry_staff'].includes(staff.role))throw new ApiError(403,'문의 담당 직원 권한이 필요합니다.');
  return staff;
}
export function mutationMeta(body:Record<string,unknown>) {
  const key=uuidField(body.request_key),revision=body.revision;
  if(!Number.isInteger(revision)||Number(revision)<1)throw new ApiError(400,'최신 문의 버전이 필요합니다. 새로고침해 주세요.');
  return {key,revision:Number(revision)};
}
export async function listInquiries(request:Request) {
  const p=new URL(request.url).searchParams,page=Math.max(1,Math.min(100000,Number(p.get('page'))||1));
  if(!Number.isInteger(page))throw new ApiError(400,'페이지 번호를 확인해 주세요.');
  let q=supabaseAdmin.from('commercial_inquiries').select('*',{count:'exact'});
  const kind=p.get('kind'),status=p.get('status'),assigned=p.get('assigned_to');
  if(kind){if(!['export_rfq','domestic_wholesale'].includes(kind))throw new ApiError(400,'문의 종류를 확인해 주세요.');q=q.eq('kind',kind);}
  if(status){if(!INQUIRY_STATUSES.includes(status as typeof INQUIRY_STATUSES[number]))throw new ApiError(400,'상태를 확인해 주세요.');q=q.eq('status',status);}
  if(assigned)q=assigned==='unassigned'?q.is('assigned_to',null):q.eq('assigned_to',uuidField(assigned));
  const term=(p.get('q')||'').slice(0,120).replace(/[^\p{L}\p{N}@.+ -]/gu,' ').trim();
  if(term){if(/^[0-9a-f-]{36}$/i.test(term))q=q.eq('id',uuidField(term));else q=q.or(['company','contact_name','email','country'].map(k=>k+'.ilike.%'+term+'%').join(','));}
  const [rows,staff]=await Promise.all([q.order('created_at',{ascending:false}).order('id').range((page-1)*30,page*30-1),
    supabaseAdmin.from('user_profiles').select('id,name,role').eq('status','active').in('role',['admin','inquiry_staff']).order('name')]);
  databaseError(rows.error);databaseError(staff.error);
  return {inquiries:rows.data||[],total:rows.count||0,page,page_size:30,staff:staff.data||[]};
}
export async function inquiryById(id:string):Promise<CrmInquiry> {
  const r=await supabaseAdmin.from('commercial_inquiries').select('*').eq('id',id).maybeSingle();databaseError(r.error);
  if(!r.data)throw new ApiError(404,'문의를 찾을 수 없습니다.');return r.data as CrmInquiry;
}
export async function detail(id:string) {
  const inquiry=await inquiryById(id);
  const [activities,quotes,notifications]=await Promise.all([
    supabaseAdmin.from('b2b_inquiry_activities').select('id,event,visibility,message,details,created_at,actor_id').eq('inquiry_id',id).order('created_at',{ascending:false}).order('id').limit(200),
    supabaseAdmin.from('b2b_quote_drafts').select('*').eq('inquiry_id',id).order('version',{ascending:false}).limit(30),
    supabaseAdmin.from('b2b_notification_outbox').select('*').eq('inquiry_id',id).order('created_at',{ascending:false}).limit(100),
  ]);
  for(const r of [activities,quotes,notifications])databaseError(r.error);
  const ids=(notifications.data||[]).map(n=>n.id);
  const attempts=ids.length?await supabaseAdmin.from('b2b_notification_attempts').select('id,notification_id,attempt,result,message,created_at').in('notification_id',ids).order('created_at',{ascending:false}).limit(200):{data:[],error:null};
  databaseError(attempts.error);
  return {inquiry,activities:activities.data||[],quotes:quotes.data||[],notifications:notifications.data||[],attempts:attempts.data||[]};
}
export async function changeInquiry(actor:string,id:string,body:Record<string,unknown>) {
  const meta=mutationMeta(body),action=String(body.action);let data:Record<string,unknown>;
  if(action==='status') {
    const status=String(body.status) as typeof INQUIRY_STATUSES[number];
    if(!INQUIRY_STATUSES.includes(status))throw new ApiError(400,'상태를 확인해 주세요.');
    data={status,message:'진행 상태: '+INQUIRY_STATUS_LABELS[status]};
  }else if(action==='assign')data={assigned_to:body.assigned_to?uuidField(body.assigned_to):null};
  else if(action==='note'||action==='reply') {
    if(typeof body.message!=='string'||!body.message.trim()||body.message.length>5000)throw new InquiryValidationError({message:'내용을 1~5,000자로 입력해 주세요.'});
    data={message:body.message.trim()};
  }else throw new ApiError(400,'지원하지 않는 작업입니다.');
  const hash=await digest(JSON.stringify({action,data}));
  const result=await supabaseAdmin.rpc('b2b_crm_change',{p_actor:actor,p_id:id,p_expected:meta.revision,p_key:meta.key,p_hash:hash,p_action:action,p_data:data});
  databaseError(result.error);return result.data;
}
async function pricingIdentity(inquiry:CrmInquiry):Promise<CustomerSession|null> {
  if(!inquiry.submitted_by&&!inquiry.company_id)return null;
  if(!inquiry.submitted_by)throw new ApiError(409,'문의 작성자 확인이 필요합니다.');
  const account=await supabaseAdmin.from('customer_accounts').select('status').eq('id',inquiry.submitted_by).maybeSingle();databaseError(account.error);
  if(account.data?.status!=='active')throw new ApiError(409,'현재 이용 가능한 작성자 계정인지 확인해 주세요.');
  const session:CustomerSession={user:{id:inquiry.submitted_by,email:'',name:''},company:null,membership:null};
  if(inquiry.company_id) {
    const [company,member]=await Promise.all([supabaseAdmin.from('companies').select('*').eq('id',inquiry.company_id).maybeSingle(),
      supabaseAdmin.from('company_members').select('company_id,role,status').eq('company_id',inquiry.company_id).eq('user_id',inquiry.submitted_by).maybeSingle()]);
    databaseError(company.error);databaseError(member.error);
    if(company.data?.status!=='approved'||member.data?.status!=='active')throw new ApiError(409,'현재 회사·소속 권한을 확인한 후 견적을 작성해 주세요.');
    session.company=company.data;session.membership=member.data;
  }
  return session;
}
export async function saveQuote(actor:string,id:string,body:Record<string,unknown>) {
  const meta=mutationMeta(body),review=parseReview(body.review),base=body.base_id?uuidField(body.base_id):null;
  const hash=await digest(JSON.stringify({base,review}));
  // Replay before loading current prices: an expired price cannot break a saved response.
  const existing=await supabaseAdmin.from('b2b_quote_drafts').select('*').eq('inquiry_id',id).eq('request_key',meta.key).maybeSingle();databaseError(existing.error);
  if(existing.data){if(existing.data.created_by!==actor||existing.data.request_hash!==hash)throw new ApiError(409,'요청 키와 내용이 일치하지 않습니다.');return existing.data as QuoteDraft;}
  const inquiry=await inquiryById(id),identity=await pricingIdentity(inquiry);
  const [pricing,products]=await Promise.all([loadPricingData(),getProducts()]);
  const sources:Record<string,{price:PriceRevision|null;issue?:string}>={};
  for(const item of inquiry.items) {
    try{
      const lists=identity?pricing.lists:pricing.lists.filter(l=>l.scope==='common');
      const session=identity||{user:{id:'guest',email:'',name:''},company:null,membership:null};
      sources[item.product_id]={price:selectPrice(item.product_id,session,lists,pricing.revisions)};
    }catch(e){if(e instanceof PricingError)sources[item.product_id]={price:null,issue:e.message};else throw e;}
  }
  const snapshot=buildQuoteSnapshot(inquiry,review,products,sources,pricing.rate);
  const result=await supabaseAdmin.rpc('b2b_save_quote_draft',{p_actor:actor,p_id:id,p_expected:meta.revision,p_base:base,p_key:meta.key,p_hash:hash,p_snapshot:snapshot});
  databaseError(result.error);return result.data as QuoteDraft;
}
