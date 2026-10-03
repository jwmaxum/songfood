import type {PriceLine,PriceRequest} from '../pricing/types';
export type Delivery={recipient:string;phone:string;postal_code:string;address:string;address_detail:string;desired_date:string;temperature:'product_standard'|'ambient'|'chilled'|'frozen';note:string};
export type EvidenceRequest={kind:'none'|'cash_receipt'|'tax_invoice';company:string;registration_no:string;email:string;note:string};
export type BankSettings={bank:string;account:string;holder:string;notice:string};
export type OrderLine=PriceLine & {name:string;sku:string;storage:string};
export type OrderItem={id:string;position:number;snapshot:OrderLine;shipped_quantity:number;cancelled_quantity:number};
export type OrderStatus='requested'|'reviewed'|'confirmed'|'completed'|'cancelled';
export type Order={id:string;number:string;submitted_by:string;company_id:string|null;revision:number;status:OrderStatus;
 customer:{name:string;email:string;company:string};delivery:Delivery;evidence_request:EvidenceRequest;
 net_minor:number;tax_minor:number;goods_total_minor:number;shipping_net_minor:number|null;shipping_tax_minor:number|null;total_minor:number|null;
 paid_minor:number;refunded_minor:number;credit_minor:number;claim_status:'none'|'open'|'resolved';review:{note:string;ship_date:string;temperature:string;bank:BankSettings}|null;
 accepted_at:string|null;created_at:string;updated_at:string;};
export type OrderDetail={order:Order;items:OrderItem[];payments:{id:string;kind:'deposit'|'refund';amount_minor:number;occurred_at:string;created_at:string;reference?:string;evidence?:string}[];
 shipments:{id:string;carrier:string;tracking:string;temperature:string;note:string;created_at:string;items:{item_id:string;quantity:number}[]}[];
 events:{id:string;action:string;message:string;created_at:string;details?:Record<string,unknown>}[]};
export type OrderInput={request_key:string;items:PriceRequest[];delivery:Delivery;evidence_request:EvidenceRequest;expected_prices:Pick<PriceLine,'product_id'|'unit'|'quantity'|'price_version_id'|'unit_total_minor'|'total_minor'>[]};
export const ORDER_LABELS:Record<OrderStatus,string>={requested:'주문 접수 · 공급/배송비 확인 중',reviewed:'고객의 최종 금액 확인 대기',confirmed:'주문 확정',completed:'출고 처리 완료',cancelled:'취소'};
export const TEMPERATURES={product_standard:'상품별 보관기준 (담당자 확인)',ambient:'상온',chilled:'냉장',frozen:'냉동'};
export const CARRIERS={cj:'CJ대한통운',lotte:'롯데택배',hanjin:'한진택배',post:'우체국택배',direct:'직접 배송 / 화물'};
export function trackingUrl(carrier:string,tracking:string){
 if(!/^[0-9]{8,30}$/.test(tracking))return null;
 return carrier==='cj'?'https://trace.cjlogistics.com/web/detail.jsp?slipno='+tracking:
 carrier==='lotte'?'https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo='+tracking:
 carrier==='hanjin'?'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnumText2='+tracking:
 carrier==='post'?'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1='+tracking:null;
}
export const payable=(o:Order)=>Math.max(0,(o.total_minor??o.goods_total_minor)-o.credit_minor);
export const refundDue=(o:Order)=>Math.max(0,o.paid_minor-o.refunded_minor-payable(o));
export function fulfillment(items:OrderItem[]){
 const shipped=items.reduce((n,i)=>n+i.shipped_quantity,0),remaining=items.reduce((n,i)=>n+i.snapshot.quantity-i.shipped_quantity-i.cancelled_quantity,0);
 return remaining===0?'출고/취소 수량 처리 완료':shipped>0?'부분 출고':'미출고';
}
