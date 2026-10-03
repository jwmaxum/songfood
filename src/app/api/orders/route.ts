import {json,readJson,rateLimit,ApiError} from '@/lib/request-security';
import {pricingFailure} from '@/lib/pricing/repository';
import {customerActor,orderList,submitOrder} from '@/lib/orders/repository';
import {parseOrder} from '@/lib/orders/validation';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const s=await customerActor(request),p=new URL(request.url).searchParams,page=Number(p.get('page')||1);
 if(!Number.isInteger(page))throw new ApiError(400,'페이지 번호를 확인해 주세요.');
 return json({success:true,...await orderList(s.user.id,false,page,p.get('status')||'')});
}catch(e){return pricingFailure(e);}}
export async function POST(request:Request){try{
 const s=await customerActor(request,true);await rateLimit(request,'order-submit',20,900,s.user.id);
 const input=parseOrder(await readJson(request,98304));
 return json({success:true,...await submitOrder(s,input)},201);
}catch(e){return pricingFailure(e);}}
