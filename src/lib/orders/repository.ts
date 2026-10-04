import 'server-only';
import {assertTradeAvailable} from '../launch/repository';
import {supabaseAdmin} from '../supabase-admin';
import {requireCustomer} from '../customer-auth';
import {getStaffIdentity} from '../admin-auth';
import {ApiError,digest,requireSameOrigin} from '../request-security';
import {quote} from '../pricing/repository';
import {getProducts} from '../products-db';
import type {CustomerSession} from '../b2b-types';
import type {OrderDetail,OrderInput,OrderLine} from './types';
import type {PriceLine} from '../pricing/types';
export async function orderStaff(request:Request){
 if(!['GET','HEAD'].includes(request.method))requireSameOrigin(request,true);
 const staff=await getStaffIdentity(request);
 if(!staff||!['admin','order_staff'].includes(staff.role))throw new ApiError(403,'주문 담당자 권한이 필요합니다.');
 return staff;
}
export function orderError(e:{code?:string}|null){
 if(!e)return;
 if(e.code==='23505')throw new ApiError(409,'이미 등록한 은행 거래·운송장 또는 요청입니다. 기록을 확인해 주세요.');
 if(e.code==='40001')throw new ApiError(409,'주문·가격 정보가 변경되었습니다. 최신 내용을 불러온 뒤 다시 처리해 주세요.');
 if(e.code==='42501')throw new ApiError(403,'현재 계정으로 처리할 수 없습니다.');
 if(e.code==='P0002')throw new ApiError(404,'주문을 찾을 수 없습니다.');
 if(['22023','23514'].includes(e.code||''))throw new ApiError(422,'현재 주문 상태·입금액·출고 수량·가격 유효기간을 확인해 주세요. 미입금 출고, 중복/초과 처리 또는 미등록 계좌는 허용되지 않습니다.');
 throw new ApiError(503,'주문 저장소에 연결하지 못했습니다.');
}
export const priceSignature=(lines:Pick<PriceLine,'product_id'|'unit'|'quantity'|'price_version_id'|'unit_total_minor'|'total_minor'>[])=>JSON.stringify(lines.map(l=>({
 product_id:l.product_id,unit:l.unit,quantity:l.quantity,price_version_id:l.price_version_id,unit_total_minor:l.unit_total_minor,total_minor:l.total_minor
})).sort((a,b)=>(a.product_id+':'+a.unit).localeCompare(b.product_id+':'+b.unit)));
export async function submitOrder(session:CustomerSession,input:OrderInput){
 const hash=await digest(JSON.stringify(input));
 // Read the replay before recalculating: an accepted retry survives later price expiry.
 const replay=await supabaseAdmin.rpc('b2b_order_replay',{p_actor:session.user.id,p_key:input.request_key,p_hash:hash});orderError(replay.error);
 if(replay.data)return {id:replay.data as string,replayed:true};
 await assertTradeAvailable('orders');
 const [preview,products]=await Promise.all([quote(session,input.items,'domestic'),getProducts()]);
 if(priceSignature(preview.lines)!==priceSignature(input.expected_prices))throw new ApiError(409,'상품 가격이 변경되었습니다. 구매함에서 최신 가격을 확인한 뒤 다시 주문해 주세요.');
 const lines:OrderLine[]=preview.lines.map(l=>{const product=products.find(p=>p.id===l.product_id);
 if(!product)throw new ApiError(422,'판매 중인 상품을 다시 확인해 주세요.');
 return {...l,name:product.name,sku:product.sku||'',storage:product.storage||''};});
 const company=session.company?.status==='approved'&&session.membership?.status==='active'?session.company:null;
 const result=await supabaseAdmin.rpc('b2b_order_submit',{p_actor:session.user.id,p_company:company?.id||null,p_key:input.request_key,p_hash:hash,
 p_delivery:input.delivery,p_evidence:input.evidence_request,p_lines:lines});
 orderError(result.error);return {id:result.data as string,replayed:false};
}
export async function orderDetail(actor:string,id:string,staff=false):Promise<OrderDetail>{
 const r=await supabaseAdmin.rpc('b2b_order_detail',{p_actor:actor,p_id:id,p_staff:staff});orderError(r.error);return r.data as OrderDetail;
}
export async function orderList(actor:string,staff:boolean,page:number,status:string){
 const r=await supabaseAdmin.rpc('b2b_order_list',{p_actor:actor,p_staff:staff,p_page:page,p_status:status});orderError(r.error);return r.data;
}
export async function customerActor(request:Request,write=false){if(write)requireSameOrigin(request);return requireCustomer(request);}
