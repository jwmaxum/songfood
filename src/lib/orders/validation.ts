import {ApiError,textField,uuidField} from '../request-security';
import type {Delivery,EvidenceRequest,OrderInput,BankSettings} from './types';
import {CARRIERS,TEMPERATURES} from './types';
import type {PriceRequest,TradeUnit} from '../pricing/types';
const optional=(v:unknown,label:string,max:number)=>v==null?'':textField(v,label,max,0);
export function whole(v:unknown,label:string,min=0,max=1_000_000_000){
 if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>max)throw new ApiError(400,label+' 값을 확인해 주세요.');return v;
}
export function date(v:unknown,label:string,required=false){
 const s=optional(v,label,10);
 if((required&&!s)||(s&&(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)))throw new ApiError(400,label+' 날짜를 확인해 주세요.');
 return s;
}
export function record(v:unknown):Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v))throw new ApiError(400,'입력 형식을 확인해 주세요.');return v as Record<string,unknown>;
}
export function priceItems(v:unknown):PriceRequest[]{
 if(!Array.isArray(v)||v.length<1||v.length>100)throw new ApiError(400,'상품은 1~100행까지 주문할 수 있습니다.');
 const seen=new Set<string>();
 return v.map(raw=>{const r=record(raw),product_id=textField(r.product_id,'상품',100),unit=r.unit;
 if(!['EA','BOX','CTN'].includes(String(unit))||seen.has(product_id+':'+unit))throw new ApiError(400,'중복 상품이나 구매단위를 확인해 주세요.');
 seen.add(product_id+':'+unit);return {product_id,unit:unit as TradeUnit,quantity:whole(r.quantity,'수량',1,100000)};});
}
export function parseOrder(b:Record<string,unknown>):OrderInput{
 const d=record(b.delivery),e=record(b.evidence_request),items=priceItems(b.items);
 const delivery:Delivery={recipient:textField(d.recipient,'수령인',100),phone:textField(d.phone,'연락처',30),postal_code:textField(d.postal_code,'우편번호',5),
 address:textField(d.address,'주소',300),address_detail:optional(d.address_detail,'상세주소',200),desired_date:date(d.desired_date,'희망 배송일'),
 temperature:d.temperature as Delivery['temperature'],note:optional(d.note,'배송 요청',1000)};
 if(!/^\d{5}$/.test(delivery.postal_code)||!/^\+?[\d ()-]{8,30}$/.test(delivery.phone)||!Object.hasOwn(TEMPERATURES,delivery.temperature))throw new ApiError(400,'우편번호·전화번호·보관온도를 확인해 주세요.');
 if(delivery.desired_date&&delivery.desired_date<new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}))throw new ApiError(400,'희망 배송일은 오늘 이후로 입력해 주세요.');
 if(!['none','cash_receipt','tax_invoice'].includes(String(e.kind)))throw new ApiError(400,'증빙 종류를 확인해 주세요.');
 const evidence_request:EvidenceRequest={kind:e.kind as EvidenceRequest['kind'],company:optional(e.company,'회사명',200),
 registration_no:optional(e.registration_no,'사업자번호',20),email:optional(e.email,'증빙 이메일',254),note:optional(e.note,'증빙 요청',500)};
 if(evidence_request.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(evidence_request.email))throw new ApiError(400,'증빙 이메일을 확인해 주세요.');
 if(evidence_request.kind==='tax_invoice'&&(!evidence_request.company||!/^\d{3}-?\d{2}-?\d{5}$/.test(evidence_request.registration_no)||!evidence_request.email))throw new ApiError(400,'세금계산서를 요청할 때만 회사명·사업자번호·수신 이메일이 필요합니다.');
 if(!Array.isArray(b.expected_prices)||b.expected_prices.length!==items.length)throw new ApiError(400,'가격을 다시 확인해 주세요.');
 const expected_prices=b.expected_prices.map(raw=>{const r=record(raw);return {product_id:textField(r.product_id,'상품',100),unit:r.unit as TradeUnit,quantity:whole(r.quantity,'수량',1,100000),
 price_version_id:uuidField(r.price_version_id),unit_total_minor:whole(r.unit_total_minor,'단가',0,Number.MAX_SAFE_INTEGER),total_minor:whole(r.total_minor,'상품합계',0,Number.MAX_SAFE_INTEGER)};});
 return {request_key:uuidField(b.request_key),items,delivery,evidence_request,expected_prices};
}
export function bankSettings(v:unknown):BankSettings{
 const b=record(v);return {bank:textField(b.bank,'은행명',100),account:textField(b.account,'입금계좌',100),holder:textField(b.holder,'예금주',100),notice:optional(b.notice,'입금 안내',1000)};
}
export function parseAction(b:Record<string,unknown>,staff:boolean){
 const common={request_key:uuidField(b.request_key),revision:whole(b.revision,'버전',1,2_000_000_000),action:textField(b.action,'처리 종류',40)};
 const reason=()=>textField(b.message,'처리 사유',2000,3);
 const allowed=staff?['review','deposit','ship','cancel','cancel_remaining','credit','refund','resolve_claim','evidence']:['accept','cancel','claim','deposit_report'];
 if(!allowed.includes(common.action))throw new ApiError(403,'허용되지 않은 주문 처리입니다.');
 let payload:Record<string,unknown>={};
 switch(common.action){
 case 'review': {
  if(b.supply_confirmed!==true)throw new ApiError(400,'모든 주문 수량의 공급 가능 여부를 확인해 주세요.');
  if(!Object.hasOwn(TEMPERATURES,String(b.temperature)))throw new ApiError(400,'배송 온도를 확인해 주세요.');
  if(!['vat10','exempt'].includes(String(b.shipping_tax_code)))throw new ApiError(400,'배송 과세구분을 확인해 주세요.');
  const shippingNet=whole(b.shipping_net_minor,'배송 공급가액');
  payload={shipping_net_minor:shippingNet,shipping_tax_code:b.shipping_tax_code,shipping_tax_minor:b.shipping_tax_code==='vat10'?Math.floor((shippingNet+5)/10):0,
   ship_date:date(b.ship_date,'출고 예정일',true),temperature:b.temperature,note:reason(),supply_confirmed:true};
  if(String(payload.ship_date)<new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}))throw new ApiError(400,'출고 예정일은 오늘 이후로 입력해 주세요.');
  break;}
 case 'deposit':case 'refund':{
  const occurred=textField(b.occurred_at,'거래일시',40);
  if(!/T.*(Z|[+-]\d{2}:\d{2})$/.test(occurred)||!Number.isFinite(Date.parse(occurred))||Date.parse(occurred)>Date.now()+60_000)throw new ApiError(400,'거래일시를 확인해 주세요.');
  payload={amount_minor:whole(b.amount_minor,'거래금액',1),reference:textField(b.reference,'은행 거래 참조번호',150,3).toLowerCase(),evidence:reason(),occurred_at:new Date(occurred).toISOString()};break;
 }
 case 'ship':{
  if(!Object.hasOwn(CARRIERS,String(b.carrier))||!Object.hasOwn(TEMPERATURES,String(b.temperature)))throw new ApiError(400,'운송사·보관온도를 확인해 주세요.');
  const tracking=textField(b.tracking,'운송장/배송 참조번호',100,3);
  if(b.carrier!=='direct'&&!/^\d{8,30}$/.test(tracking))throw new ApiError(400,'택배 운송장은 8~30자리 숫자로 입력해 주세요.');
  if(!Array.isArray(b.items)||b.items.length<1||b.items.length>100)throw new ApiError(400,'출고 수량을 입력해 주세요.');
  const ids=new Set<string>();
  payload={carrier:b.carrier,temperature:b.temperature,tracking,note:reason(),items:b.items.map(raw=>{const row=record(raw),item_id=uuidField(row.item_id);if(ids.has(item_id))throw new ApiError(400,'출고 행이 중복되었습니다.');ids.add(item_id);return {item_id,quantity:whole(row.quantity,'출고 수량',1,100000)};})};break;
 }
 case 'credit':payload={amount_minor:whole(b.amount_minor,'합의 감액',1),message:reason(),agreement:textField(b.agreement,'고객 합의 근거',1000,3)};break;
 case 'cancel_remaining':payload={message:reason(),agreement:textField(b.agreement,'고객 합의 근거',1000,3)};break;
 case 'accept':payload={};break;
 default:payload={message:reason()};break;
 }
 return {...common,payload};
}
