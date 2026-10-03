import {opsStaff} from '@/lib/operations/repository';
import {getBusinessSettings,validateBusinessSettings} from '@/lib/business-settings-server';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {ApiError,json,failure,readJson} from '@/lib/request-security';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{await opsStaff(request,['admin']);const settings=await getBusinessSettings();
 if(!settings.revision)throw new ApiError(503,'공개 정보 저장소를 연결하지 못했습니다. 다시 시도해 주세요.');
 return json({success:true,settings});}catch(e){return failure(e);}}
export async function PUT(request:Request){try{
 const actor=await opsStaff(request,['admin']),input=validateBusinessSettings(await readJson(request,65536));
 const {data,error}=await supabaseAdmin.rpc('b2b_save_business_settings',{p_actor:actor.id,p_revision:input.revision,p_profile:input.profile,p_reason:input.reason});
 if(error?.code==='40001')throw new ApiError(409,'다른 관리자가 변경했습니다. 새로 불러온 뒤 수정해 주세요.');
 if(error?.code==='42501')throw new ApiError(403,'관리자 권한이 필요합니다.');
 if(error)throw new ApiError(503,'저장하지 못했습니다. 설정을 다시 확인해 주세요.');
 return json({success:true,settings:data});
 }catch(e){return failure(e);}}
