import 'server-only';
import {supabaseAdmin} from '../supabase-admin';
import {ApiError,rateLimit} from '../request-security';
import {databaseError} from '../crm/repository';
import {parseIssuer} from './validation';
import type {Issuer} from './types';
export type PiSettings={revision:number;data:Issuer};
export async function getPiSettings():Promise<PiSettings|null>{
 const r=await supabaseAdmin.from('b2b_pi_settings').select('revision,data').eq('id',true).maybeSingle();
 databaseError(r.error);return r.data;
}
export function parsePiSettings(b:Record<string,unknown>){
 if(Object.keys(b).length!==2||Object.keys(b).some(k=>!['revision','seller'].includes(k))||!Number.isSafeInteger(b.revision)||Number(b.revision)<0||Number(b.revision)>2147483646
 ||!b.seller||typeof b.seller!=='object'||Array.isArray(b.seller))throw new ApiError(400,'판매자 설정과 최신 버전을 확인해 주세요.');
 const keys=['name','address','email','phone','payment_terms','bank_details'],seller=b.seller as Record<string,unknown>;
 if(Object.keys(seller).length!==keys.length||Object.keys(seller).some(k=>!keys.includes(k)))throw new ApiError(400,'판매자 필수 항목을 확인해 주세요.');
 return {revision:Number(b.revision),seller:parseIssuer(seller)};
}
export async function savePiSettings(request:Request,actor:string,body:Record<string,unknown>):Promise<PiSettings>{
 const v=parsePiSettings(body);await rateLimit(request,'pi-seller-settings',20,900,actor);
 const r=await supabaseAdmin.rpc('b2b_pi_save_settings',{p_actor:actor,p_expected:v.revision,p_data:v.seller});
 databaseError(r.error);if(!r.data)throw new ApiError(503,'판매자 정보를 저장하지 못했습니다. 저장된 정보를 다시 확인해 주세요.');
 return {revision:r.data.revision,data:r.data.data};
}
