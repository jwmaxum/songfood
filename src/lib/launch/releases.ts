import 'server-only';
import {supabaseAdmin} from '../supabase-admin';
import {ApiError,textField} from '../request-security';
export type ReleaseReview={revision:number;domestic:boolean;export:boolean;fingerprint:string;reason:string;reviewed_at:string};
export type ReleaseRow={product_id:string;name:string;sku:string;fingerprint:string;domestic_issues:string[];export_issues:string[];review:ReleaseReview|null};
export type ReleaseStatus={policy:{enabled:boolean;revision:number};products:ReleaseRow[];events:{product_id:string|null;event:string;reason:string;created_at:string}[];role:string};
export function parseRelease(body:Record<string,unknown>){
 if(typeof body.product_id!=='string'||body.product_id.length>100||!body.product_id||!Number.isInteger(body.revision)||Number(body.revision)<0
 ||typeof body.hash!=='string'||!/^[0-9a-f]{64}$/.test(body.hash)||typeof body.domestic!=='boolean'||typeof body.export!=='boolean')throw new ApiError(400,'출시 검수 항목을 확인해 주세요.');
 return {p_id:body.product_id,p_revision:Number(body.revision),p_hash:body.hash,p_domestic:body.domestic,p_export:body.export,p_reason:textField(body.reason,'출시 검수 근거·사유',1000,10)};
}
export async function releaseSnapshot(actor:string,role:string):Promise<ReleaseStatus>{
 const r=await supabaseAdmin.rpc('b2b_release_snapshot',{p_actor:actor});if(r.error||!r.data)throw new ApiError(503,'출시 검수 목록을 불러오지 못했습니다.');
 return {...r.data,role};
}
