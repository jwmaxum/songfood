import { getStaffIdentity } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ApiError, json, readJson, requireSameOrigin, textField, uuidField } from '@/lib/request-security';
import { loadPricingData, pricingFailure } from '@/lib/pricing/repository';
import { parseDraft, PricingError, readiness, timestamp } from '@/lib/pricing/validation';
import { previewCsv } from '@/lib/pricing/csv';
export const dynamic='force-dynamic';
async function staff(request:Request) {
  if(request.method!=='GET')requireSameOrigin(request,true);
  const actor=await getStaffIdentity(request);
  if(!actor || !['admin','product_staff'].includes(actor.role))throw new ApiError(403,'가격 관리 권한이 필요합니다.');
  return actor;
}
export async function GET(request:Request) {
  try {
    const actor=await staff(request);
    const [data,products,rates,audit]=await Promise.all([loadPricingData(),
      supabaseAdmin.from('products').select('id,sku,name,wholesale_price_krw,carton_qty,moq_cartons,loading_port').order('sku'),
      supabaseAdmin.from('b2b_exchange_rates').select('*').order('created_at',{ascending:false}).limit(30),
      supabaseAdmin.from('b2b_pricing_audit').select('*').order('created_at',{ascending:false}).limit(100)]);
    if(products.error || rates.error || audit.error)throw new ApiError(503,'가격 관리 자료를 읽지 못했습니다.');
    return json({success:true,...data,products:products.data,rates:rates.data,audit:audit.data,canApprove:actor.role==='admin'});
  } catch(error) {return pricingFailure(error);}
}
export async function POST(request:Request) {
  try {
    const actor=await staff(request),body=await readJson(request,300000);
    let result;
    if(body.action==='draft') {
      const draft=parseDraft(body.draft);
      result=await supabaseAdmin.rpc('b2b_save_price_drafts',{p_actor:actor.id,p_rows:[draft]});
    } else if(body.action==='approve') {
      if(actor.role!=='admin')throw new ApiError(403,'가격 승인은 관리자만 가능합니다.');
      const id=uuidField(body.id),{data,error}=await supabaseAdmin.from('b2b_price_revisions').select('*').eq('id',id).single();
      if(error || !data)throw new ApiError(404,'가격 초안을 찾을 수 없습니다.');
      const missing=readiness(data);
      if(missing.length)throw new PricingError('INCOMPLETE','승인 전 확인: '+missing.join(', '));
      result=await supabaseAdmin.rpc('b2b_approve_price',{p_actor:actor.id,p_id:id});
    } else if(body.action==='preview_csv' || body.action==='import_csv') {
      const listId=uuidField(body.price_list_id),csv=textField(body.csv,'CSV',256000);
      const [productResult,data]=await Promise.all([supabaseAdmin.from('products').select('id,sku'),loadPricingData()]);
      if(productResult.error)throw new ApiError(503,'SKU를 확인하지 못했습니다.');
      const bases:Record<string,string>={};
      for(const p of data.revisions)if(p.price_list_id===listId && p.status==='approved' && !bases[p.product_id])bases[p.product_id]=p.id;
      let rows;
      try {rows=previewCsv(csv,productResult.data,listId,bases);} catch(e) {throw new PricingError('CSV',e instanceof Error?e.message:'CSV 오류',400);}
      if(body.action==='preview_csv')return json({success:true,rows});
      if(!rows.length || rows.some(r=>r.errors.length))throw new PricingError('CSV','행 오류를 모두 수정한 뒤 다시 저장해 주세요.',400);
      result=await supabaseAdmin.rpc('b2b_save_price_drafts',{p_actor:actor.id,p_rows:rows.map(r=>r.draft)});
    } else if(body.action==='rate') {
      if(actor.role!=='admin')throw new ApiError(403,'환율 승인은 관리자만 가능합니다.');
      const rate=String(body.krw_per_usd||'');
      if(!/^\d{1,8}(\.\d{1,6})?$/.test(rate) || Number(rate)<=0)throw new PricingError('RATE','환율은 KRW / 1 USD 양수로 입력해 주세요.');
      const observed=timestamp(body.observed_at,'환율 기준시각'),until=timestamp(body.valid_until,'환율 유효시각');
      if(!observed || !until || Date.parse(observed)>Date.now() || Date.parse(until)<=Date.now() || Date.parse(until)-Date.parse(observed)>7*86400000)
        throw new PricingError('RATE','현재 시각을 포함하는 환율 유효기간(최대 7일)을 지정해 주세요.');
      result=await supabaseAdmin.rpc('b2b_add_exchange_rate',{p_actor:actor.id,p_rate:rate,p_source:textField(body.source,'환율 출처',1000,3),
        p_observed:observed,p_until:until,p_reason:textField(body.reason,'승인 사유',1000,3)});
    } else if(body.action==='create_list') {
      if(actor.role!=='admin')throw new ApiError(403,'가격표 생성은 관리자만 가능합니다.');
      if(!['common','personal','business','company'].includes(String(body.scope)))throw new ApiError(400,'가격표 구분을 확인해 주세요.');
      result=await supabaseAdmin.from('b2b_price_lists').insert({name:textField(body.name,'가격표 이름',100),scope:body.scope,
        company_id:body.scope==='company'?uuidField(body.company_id):null,created_by:actor.id}).select('*');
    } else throw new ApiError(400,'지원하지 않는 작업입니다.');
    if(result.error) {
      if(result.error.code==='40001')throw new ApiError(409,'다른 가격 버전이 먼저 승인되었습니다. 최신 버전을 기준으로 새 초안을 작성해 주세요.');
      if(result.error.code==='23505')throw new ApiError(409,'같은 대상의 활성 가격표가 이미 있습니다.');
      if(result.error.code==='22023' || result.error.code==='23514')throw new ApiError(422,'필수 검수 정보·적용기간·포장 환산을 다시 확인해 주세요.');
      throw new ApiError(503,'가격 변경을 저장하지 못했습니다.');
    }
    return json({success:true,data:result.data});
  } catch(error) {return pricingFailure(error);}
}
