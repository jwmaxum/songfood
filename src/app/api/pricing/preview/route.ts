import { requireCustomer } from '@/lib/customer-auth';
import { rateLimit, readJson, requireSameOrigin, json } from '@/lib/request-security';
import { quote, pricingFailure } from '@/lib/pricing/repository';
import { PricingError } from '@/lib/pricing/validation';
import type { PriceRequest } from '@/lib/pricing/types';
export const dynamic='force-dynamic';
export async function POST(request:Request) {
  try {
    requireSameOrigin(request);
    const session=await requireCustomer(request);
    await rateLimit(request,'price-preview',120,60,session.user.id);
    const body=await readJson(request);
    if(Object.keys(body).some(k=>!['items','market'].includes(k)) || !['domestic','export'].includes(String(body.market)) || !Array.isArray(body.items) || !body.items.length || body.items.length>100)
      throw new PricingError('INVALID_REQUEST','상품·구매 단위·수량과 국내/해외 구분만 전송해 주세요.',400);
    const items=body.items.map(value=>{
      if(!value || typeof value!=='object' || Array.isArray(value)) throw new PricingError('INVALID_REQUEST','상품 요청을 확인해 주세요.',400);
      const row=value as Record<string,unknown>;
      if(Object.keys(row).some(k=>!['product_id','unit','quantity'].includes(k)) || typeof row.product_id!=='string' || row.product_id.length>100)
        throw new PricingError('INVALID_REQUEST','임의 단가·환율·사용자·회사 정보를 가격 요청에 포함할 수 없습니다.',400);
      return {product_id:row.product_id,unit:row.unit,quantity:row.quantity} as PriceRequest;
    });
    if(new Set(items.map(i=>i.product_id+':'+i.unit)).size!==items.length)throw new PricingError('DUPLICATE_LINE','같은 상품·단위의 수량을 한 행으로 합쳐 주세요.',400);
    return json({success:true,preview:await quote(session,items,body.market as 'domestic'|'export')});
  } catch(error) { return pricingFailure(error); }
}
