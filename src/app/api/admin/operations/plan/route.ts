import {opsStaff} from '@/lib/operations/repository';
import {workPlan} from '@/lib/operations/validation';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {orderError} from '@/lib/orders/repository';
import {json,failure,readJson,digest,rateLimit,ApiError} from '@/lib/request-security';
export async function POST(request:Request){
 try{
 const actor=await opsStaff(request,['admin','inquiry_staff','order_staff']),plan=workPlan(await readJson(request));
 if(actor.role!=='admin'&&actor.role!==(plan.p_kind==='inquiry'?'inquiry_staff':'order_staff'))throw new ApiError(403,'해당 업무 담당자 권한이 필요합니다.');
 await rateLimit(request,'ops-plan',60,60,actor.id);
 const {p_key,p_expected,...payload}=plan;
 const r=await supabaseAdmin.rpc('b2b_ops_plan',{...plan,p_actor:actor.id,p_hash:await digest(JSON.stringify(payload))});orderError(r.error);
 return json({success:true,request_key:p_key,previous_revision:p_expected});
 }catch(e){return failure(e);}
}
