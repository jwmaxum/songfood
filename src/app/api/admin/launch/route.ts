import {opsStaff} from '@/lib/operations/repository';
import {launchStatus,parseServiceControls} from '@/lib/launch/repository';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {ApiError,json,failure,readJson} from '@/lib/request-security';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const a=await opsStaff(request,['admin']);return json({success:true,...await launchStatus(a.id)});}catch(e){return failure(e);}}
export async function PUT(request:Request){try{
 const a=await opsStaff(request,['admin']),v=parseServiceControls(await readJson(request,8192));
 const r=await supabaseAdmin.rpc('b2b_save_service_controls',{p_actor:a.id,p_revision:v.revision,p_state:v.state,p_reason:v.reason});
 if(r.error?.code==='40001')throw new ApiError(409,'다른 관리자가 변경했습니다. 다시 불러온 뒤 처리해 주세요.');
 if(r.error?.code==='42501')throw new ApiError(403,'관리자 권한이 필요합니다.');
 if(r.error?.code==='22023')throw new ApiError(400,'등록된 활성 직원과 운영 상태를 확인해 주세요.');
 if(r.error)throw new ApiError(503,'운영 상태를 저장하지 못했습니다.');
 return json({success:true,controls:r.data});
}catch(e){return failure(e);}}
