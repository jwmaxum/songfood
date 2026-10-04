import {opsStaff} from '@/lib/operations/repository';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {callMailRelay} from '@/lib/notifications/repository';
import {json,failure,ApiError,rateLimit} from '@/lib/request-security';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{await opsStaff(request,['admin']);
  const [transport,events,pending]=await Promise.all([
   supabaseAdmin.from('b2b_mail_transport').select('verified_at,last_checked_at,last_code').eq('id',true).maybeSingle(),
   supabaseAdmin.from('b2b_email_events').select('id,event,attempt,code,created_at,notification_id').order('created_at',{ascending:false}).limit(50),
   supabaseAdmin.from('b2b_email_deliveries').select('notification_id,state,attempt,last_code,updated_at,lease_until').in('state',['failed','uncertain','sending']).order('updated_at',{ascending:false}).limit(100)]);
  if(transport.error||events.error||pending.error)throw new ApiError(503,'메일 운영 기록을 불러오지 못했습니다.');
  return json({transport:transport.data,events:events.data,pending:pending.data,daily_cap:50});
 }catch(e){return failure(e);}
}
export async function POST(request:Request){
 try{const actor=await opsStaff(request,['admin']);await rateLimit(request,'mail-verify',3,900,actor.id);
 return json(await callMailRelay(actor.id,'verify'));}catch(e){return failure(e);}
}
