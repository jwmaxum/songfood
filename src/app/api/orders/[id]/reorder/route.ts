import {json,uuidField,ApiError} from '@/lib/request-security';
import {pricingFailure,quote} from '@/lib/pricing/repository';
import {getProducts} from '@/lib/products-db';
import {customerActor,orderDetail} from '@/lib/orders/repository';
import {publicProduct} from '@/lib/public-product';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{
 const s=await customerActor(request),d=await orderDetail(s.user.id,uuidField((await params).id));
 const items=d.items.map(i=>({product_id:i.snapshot.product_id,unit:i.snapshot.unit,quantity:i.snapshot.quantity}));
 const [preview,products]=await Promise.all([quote(s,items,'domestic'),getProducts()]);
 const cart=items.map(i=>{const p=products.find(p=>p.id===i.product_id);if(!p)throw new ApiError(422,'현재 구매 가능한 상품을 확인해 주세요.');return {...i,product:publicProduct(p)};});
 return json({success:true,items:cart,preview,message:'현재 가격·최소 구매단위를 확인했습니다. 배송비와 공급 가능 수량은 새 주문에서 다시 확인합니다.'});
}catch(e){return pricingFailure(e);}}
