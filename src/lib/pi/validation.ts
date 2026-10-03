import {InquiryValidationError} from '../commercial-inquiry';
import {calculateLine} from '../pricing/engine';
import type {QuoteDraft} from '../crm/types';
import type {PriceRevision,ExchangeRate} from '../pricing/types';
import {PI_NOTICE,type Issuer,type IssueInput,type PiSnapshot} from './types';
export function parseIssuer(raw:unknown):Issuer{
 const b=raw&&typeof raw==='object'?raw as Record<string,unknown>:{},errors:Record<string,string>={},out:Record<string,string>={};
 for(const [k,max]of Object.entries({name:200,address:600,email:254,phone:80,payment_terms:1200,bank_details:1200})){
  const v=typeof b[k]==='string'?(b[k] as string).normalize('NFC').trim():'';
  if(!v||v.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))errors[k]='필수 정보를 '+max+'자 이내로 입력해 주세요.';
  out[k]=v;
 }
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))errors.email='판매자 이메일을 확인해 주세요.';
 if(Object.keys(errors).length)throw new InquiryValidationError(errors);
 return out as Issuer;
}
export function parseIssue(raw:unknown):IssueInput{
 const b=raw&&typeof raw==='object'?raw as Record<string,unknown>:{},seller=parseIssuer(b.seller),errors:Record<string,string>={};
 function value(k:string,max:number,min=1){const v=typeof b[k]==='string'?(b[k] as string).normalize('NFC').trim():'';if(v.length<min||v.length>max)errors[k]='필수 입력과 길이를 확인해 주세요.';return v;}
 const buyer_address=value('buyer_address',600),change_reason=value('change_reason',1000,3),valid_until=value('valid_until',40);
 if(!Number.isFinite(Date.parse(valid_until))||!/(Z|[+-]\d\d:\d\d)$/.test(valid_until))errors.valid_until='시간대가 포함된 유효기간을 입력해 주세요.';
 if(b.fob_confirmed!==true)errors.fob_confirmed='FOB 포함 비용 검토를 확인해 주세요.';
 if(Object.keys(errors).length)throw new InquiryValidationError(errors);
 return {seller,buyer_address,change_reason,valid_until:new Date(valid_until).toISOString(),fob_confirmed:true};
}
function canonical(v:unknown):string {if(Array.isArray(v))return JSON.stringify(v.map(canonical));if(v&&typeof v==='object')return JSON.stringify(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)]));return JSON.stringify(v)??'undefined';}
export function buildPiSnapshot(quote:QuoteDraft,input:IssueInput,revisions:PriceRevision[],rate:ExchangeRate|null,now=new Date()):PiSnapshot{
 const q=quote.snapshot,errors:Record<string,string>={};
 if(q.issues.length||q.review.stock_status!=='available'||q.review.documents_status!=='ready'||!q.review.lead_time_note||q.incoterms!=='FOB'||q.requested.incoterms!=='FOB')errors.quote='검토가 완료된 FOB 견적 초안이 필요합니다.';
 if(q.review.adjustments.length&&(q.review.consultation_status!=='agreed'||q.review.consultation_note.length<10))errors.quote='가격 조정의 사전 협의 근거가 필요합니다.';
 if(!q.lines.length||q.lines.length>100||!q.valid_until||Date.parse(q.valid_until)<=now.getTime())errors.quote='견적 가격이 없거나 만료되었습니다. 새 초안을 작성해 주세요.';
 if(!rate||rate.id!==q.exchange_rate?.id||Date.parse(rate.valid_until)<=now.getTime())errors.rate='견적에 고정한 환율의 유효성을 확인해 주세요.';
 const lines=q.lines.map(l=>{
  const current=revisions.find(p=>p.id===l.price_source?.id);
  if(!current||current.status!=='approved'||canonical(current)!==canonical(l.price_source))errors.price='승인 가격 원본이 변경되었거나 사용할 수 없습니다. 새 견적 초안을 작성해 주세요.';
  let fresh=null;
  try{if(current)fresh=calculateLine(current,{product_id:l.product_id,unit:'CTN',quantity:l.quantity},'export',rate,now);}catch{errors.price='가격·포장·MOQ·FOB·유효기간 검토가 필요합니다.';}
  if(!fresh||!l.base||fresh.total_minor!==l.base.total_minor||fresh.price_version_id!==l.base.price_version_id||fresh.ea_per_unit!==l.base.ea_per_unit||fresh.loading_port!==l.base.loading_port)errors.price='견적의 계산 근거가 현재 승인 원본과 일치하지 않습니다.';
  if(!l.proposed_unit_minor||!Number.isSafeInteger(l.proposed_unit_minor)||l.proposed_total_minor!==l.proposed_unit_minor*l.quantity)errors.amount='견적 금액을 다시 확인해 주세요.';
  return {product_id:l.product_id,sku:l.sku,name:l.name,quantity:l.quantity,ea_per_ctn:l.base?.ea_per_unit||0,loading_port:l.base?.loading_port||'',unit_minor:l.proposed_unit_minor||0,total_minor:l.proposed_total_minor||0};
 });
 const total=lines.reduce((n,l)=>n+l.total_minor,0);
 if(!Number.isSafeInteger(total)||total<=0||total!==q.proposed_total_minor)errors.amount='견적 합계가 일치하지 않습니다.';
 if(Date.parse(input.valid_until)<=now.getTime()||Date.parse(input.valid_until)>Date.parse(q.valid_until||'')||Date.parse(input.valid_until)>Date.parse(rate?.valid_until||''))errors.valid_until='PI 유효기간은 현재 이후, 가격·환율 만료 이전이어야 합니다.';
 if(Object.keys(errors).length)throw new InquiryValidationError(errors);
 return {kind:'proforma_invoice',seller:input.seller,buyer:{name:q.buyer.company,contact:q.buyer.contact_name,address:input.buyer_address,country:q.buyer.country||'',destination:q.buyer.destination_port||''},
 currency:'USD',incoterms:'FOB',valid_until:input.valid_until,lead_time:q.review.lead_time_note,documents:q.requested.documents,change_reason:input.change_reason,notice:PI_NOTICE,lines,total_minor:total,source_valid_until:q.valid_until!};
}
