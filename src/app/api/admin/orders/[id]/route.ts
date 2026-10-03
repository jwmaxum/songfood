import {json,readJson,digest,uuidField,rateLimit} from '@/lib/request-security';
import {pricingFailure} from '@/lib/pricing/repository';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {orderStaff,orderDetail,orderError} from '@/lib/orders/repository';
import {parseAction} from '@/lib/orders/validation';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){try{
 const s=await orderStaff(request);return json({success:true,...await orderDetail(s.id,uuidField((await params).id),true)});
}catch(e){return pricingFailure(e);}}
export async function POST(request:Request,{params}:Context){try{
 const s=await orderStaff(request);await rateLimit(request,'order-staff-action',100,900,s.id);
 const id=uuidField((await params).id),b=parseAction(await readJson(request,98304),true);
 const r=await supabaseAdmin.rpc('b2b_order_action',{p_actor:s.id,p_id:id,p_staff:true,p_expected:b.revision,p_key:b.request_key,p_hash:await digest(JSON.stringify(b)),p_action:b.action,p_data:b.payload});
 orderError(r.error);return json({success:true,...await orderDetail(s.id,id,true)});
}catch(e){return pricingFailure(e);}}
