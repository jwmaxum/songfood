import {json,ApiError} from '@/lib/request-security';
import {pricingFailure} from '@/lib/pricing/repository';
import {orderStaff,orderList} from '@/lib/orders/repository';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const s=await orderStaff(request),p=new URL(request.url).searchParams,page=Number(p.get('page')||1);
 if(!Number.isInteger(page))throw new ApiError(400,'페이지를 확인해 주세요.');
 return json({success:true,is_admin:s.role==='admin',...await orderList(s.id,true,page,p.get('status')||'')});
}catch(e){return pricingFailure(e);}}
