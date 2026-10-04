import {crmStaff,crmFailure,databaseError} from '@/lib/crm/repository';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {mailPreview,parseMailSend,callMailRelay} from '@/lib/notifications/repository';
import {json,readJson,uuidField,rateLimit,ApiError,textField} from '@/lib/request-security';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{const actor=await crmStaff(request);return json(await mailPreview(request,actor.id,uuidField((await params).id)));}catch(e){return crmFailure(e);}
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 try{const actor=await crmStaff(request),id=uuidField((await params).id),body=await readJson(request,2048);
  if(body.action==='reset'){
   if(actor.role!=='admin'||body.confirmed!==true)throw new ApiError(403,'관리자 확인이 필요합니다.');
   const r=await supabaseAdmin.rpc('b2b_mail_prepare',{p_actor:actor.id,p_id:id,p_action:'reset',p_reason:textField(body.reason,'결과 확인·재시도 사유',500,10)});databaseError(r.error);return json({success:true,delivery:r.data.delivery});
  }
  if(body.action!==undefined&&body.action!=='send')throw new ApiError(400,'메일 처리 작업을 확인해 주세요.');
  const data=parseMailSend(body);await rateLimit(request,'customer-document-email',10,3600,actor.id);
  return json(await callMailRelay(actor.id,'send',{id,...data}));
 }catch(e){return crmFailure(e);}
}
