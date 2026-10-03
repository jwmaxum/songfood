import {json,readJson,ApiError} from '@/lib/request-security';
import {pricingFailure} from '@/lib/pricing/repository';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {orderStaff,orderError} from '@/lib/orders/repository';
import {bankSettings,whole} from '@/lib/orders/validation';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const s=await orderStaff(request);const r=await supabaseAdmin.from('b2b_order_settings').select('revision,data').eq('id',true).maybeSingle();orderError(r.error);
 return json({success:true,is_admin:s.role==='admin',settings:r.data});
}catch(e){return pricingFailure(e);}}
export async function POST(request:Request){try{
 const s=await orderStaff(request);if(s.role!=='admin')throw new ApiError(403,'계좌 변경은 관리자만 가능합니다.');
 const b=await readJson(request),data=bankSettings(b.data);
 const r=await supabaseAdmin.rpc('b2b_order_settings_save',{p_actor:s.id,p_expected:whole(b.revision,'설정 버전',0),p_data:data});orderError(r.error);
 return json({success:true,settings:r.data});
}catch(e){return pricingFailure(e);}}
