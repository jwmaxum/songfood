import {ApiError,json,failure,readJson,rateLimit} from '@/lib/request-security';
import {opsStaff} from '@/lib/operations/repository';
import {isSuperAdmin,staffMutation,staffSnapshot,staffError} from '@/lib/staff-management';
import {supabaseAdmin} from '@/lib/supabase-admin';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const actor=await opsStaff(request,['admin']);return json({success:true,...await staffSnapshot(actor.id)});}catch(e){return failure(e);}}
async function mutate(request:Request,action:'register'|'update'|'remove'){
 try{
  const actor=await opsStaff(request,['admin']);
  if(!await isSuperAdmin(actor.id))throw new ApiError(403,'최고관리자만 직원 정보를 관리할 수 있습니다.');
  const input=staffMutation(await readJson(request,4096),action);
  await rateLimit(request,'staff-management',30,900,actor.id);
  const r=await supabaseAdmin.rpc('b2b_manage_staff',{p_actor:actor.id,...input});staffError(r.error);
  if(!r.data)throw new ApiError(503,'직원 정보를 저장하지 못했습니다.');
  return json({success:true,data:r.data},action==='register'?201:200);
 }catch(e){return failure(e);}
}
export const POST=(r:Request)=>mutate(r,'register');
export const PATCH=(r:Request)=>mutate(r,'update');
export const DELETE=(r:Request)=>mutate(r,'remove');
