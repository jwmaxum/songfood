import {opsStaff} from '@/lib/operations/repository';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {parseRelease,releaseSnapshot} from '@/lib/launch/releases';
import {databaseError} from '@/lib/crm/repository';
import {json,failure,readJson,ApiError,textField} from '@/lib/request-security';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const a=await opsStaff(request,['admin','product_staff']);return json(await releaseSnapshot(a.id,a.role));}catch(e){return failure(e);}}
export async function PUT(request:Request){
 try{const a=await opsStaff(request,['admin']),b=await readJson(request,4096);let result;
 if(b.action==='policy'){
 if(!Number.isInteger(b.revision)||Number(b.revision)<1||typeof b.enabled!=='boolean')throw new ApiError(400,'출시 제한 설정을 확인해 주세요.');
 result=await supabaseAdmin.rpc('b2b_set_release_policy',{p_actor:a.id,p_revision:b.revision,p_enabled:b.enabled,p_reason:textField(b.reason,'변경 사유',1000,10)});
 }else{result=await supabaseAdmin.rpc('b2b_save_release',{p_actor:a.id,...parseRelease(b)});}
 databaseError(result.error);return json({success:true,data:result.data});
 }catch(e){return failure(e);}
}
