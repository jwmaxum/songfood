import {opsStaff} from '@/lib/operations/repository';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {json,failure,uuidField,ApiError} from '@/lib/request-security';
import {orderError} from '@/lib/orders/repository';
export async function GET(request:Request,{params}:{params:Promise<{kind:string;id:string}>}){
 try{const {kind,id}=await params;if(!['inquiry','order'].includes(kind))throw new ApiError(400,'업무 종류를 확인해 주세요.');
 const actor=await opsStaff(request,kind==='inquiry'?['admin','inquiry_staff']:['admin','order_staff']),page=Number(new URL(request.url).searchParams.get('page')||1);
 if(!Number.isInteger(page)||page<1||page>100000)throw new ApiError(400,'페이지를 확인해 주세요.');
 const r=await supabaseAdmin.rpc('b2b_ops_history',{p_actor:actor.id,p_kind:kind,p_id:uuidField(id),p_page:page});orderError(r.error);return json({success:true,...r.data});
 }catch(e){return failure(e);}
}
