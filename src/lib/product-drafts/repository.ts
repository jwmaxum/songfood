import 'server-only';
import {supabaseAdmin} from '../supabase-admin';
import {ApiError} from '../request-security';
import type {parseDraftSave,parseDraftPublish} from './validation';
export function draftDatabaseError(error:{code?:string}|null){
 if(!error)return;
 if(error.code==='40001')throw new ApiError(409,'초안 또는 원본 상품이 변경되었습니다. 최신 내용을 확인한 뒤 다시 작성해 주세요.');
 if(error.code==='23505')throw new ApiError(409,'같은 SKU 또는 작성 중인 상품 초안이 있습니다. 기존 내용을 확인해 주세요.');
 if(error.code==='42501')throw new ApiError(403,'상품 담당 직원 권한이 필요합니다.');
 if(error.code==='P0002')throw new ApiError(404,'초안 또는 상품을 찾을 수 없습니다.');
 if(['22023','23514','23502','22003'].includes(error.code||''))throw new ApiError(400,'상품명·SKU·분류 또는 입력한 항목을 확인해 주세요. 빈 항목은 초안으로 저장할 수 있습니다.');
 throw new ApiError(503,'상품 초안 저장소에 연결하지 못했습니다.');
}
export async function draftSnapshot(actor:string,id:string|null,product_id:string|null){
 const r=await supabaseAdmin.rpc('b2b_product_draft_snapshot',{p_actor:actor,p_id:id,p_product_id:product_id});draftDatabaseError(r.error);
 if(!r.data)throw new ApiError(503,'상품 초안을 불러오지 못했습니다.');return r.data;
}
export async function saveDraft(actor:string,input:ReturnType<typeof parseDraftSave>){
 const r=await supabaseAdmin.rpc('b2b_save_product_draft',{p_actor:actor,p_id:input.id,p_product_id:input.product_id,p_revision:input.revision,p_base_hash:input.base_hash,p_data:input.data,p_source_notes:input.source_notes,p_reason:input.reason,p_rebase:input.rebase});draftDatabaseError(r.error);
 if(!r.data)throw new ApiError(503,'상품 초안을 저장하지 못했습니다.');return r.data;
}
export async function publishDraft(actor:string,input:ReturnType<typeof parseDraftPublish>){
 const r=await supabaseAdmin.rpc('b2b_publish_product_draft',{p_actor:actor,p_id:input.id,p_revision:input.revision,p_reason:input.reason});draftDatabaseError(r.error);
 if(!r.data)throw new ApiError(503,'상품 공개 반영을 완료하지 못했습니다.');return r.data;
}
