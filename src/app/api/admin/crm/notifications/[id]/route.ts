import {crmStaff,crmFailure,databaseError} from '@/lib/crm/repository';
import {json,readJson,uuidField,ApiError} from '@/lib/request-security';
import {supabaseAdmin} from '@/lib/supabase-admin';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  try{const staff=await crmStaff(request),id=uuidField((await params).id),body=await readJson(request,1024);
    if(typeof body.simulate_failure!=='boolean')throw new ApiError(400,'테스트 전달 모드를 확인해 주세요.');
    const result=await supabaseAdmin.rpc('b2b_deliver_test_notification',{p_actor:staff.id,p_id:id,p_fail:body.simulate_failure});
    databaseError(result.error);return json({success:true,notification:result.data,test_only:true});
  }catch(e){return crmFailure(e);}
}
