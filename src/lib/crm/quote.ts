import {InquiryValidationError} from '../commercial-inquiry';
import {calculateLine} from '../pricing/engine';
import {PricingError} from '../pricing/validation';
import {FOB_NOTICE,type ExchangeRate,type PriceRevision} from '../pricing/types';
import type {ProductItem} from '../types';
import type {CrmInquiry,ReviewInput,QuoteSnapshot} from './types';
export function usdMinor(value:unknown) {
  if(typeof value!=='string'||!/^\d{1,8}(\.\d{1,2})?$/.test(value)||Number(value)<=0)throw new InquiryValidationError({adjustments:'조정 단가는 0보다 큰 USD 금액이며 소수 2자리까지 가능합니다.'});
  const [whole,fraction='']=value.split('.');
  return Number(whole)*100+Number(fraction.padEnd(2,'0'));
}
export function parseReview(input:unknown):ReviewInput {
  const b=input&&typeof input==='object'?input as Record<string,unknown>:{},errors:Record<string,string>={};
  function text(k:string,max:number,min=0){const value=typeof b[k]==='string'?(b[k] as string).trim():'';if(value.length>max||value.length<min)errors[k]=min?'검토 근거를 '+min+'자 이상 입력해 주세요.':'입력 길이를 확인해 주세요.';return value;}
  const stock_status=b.stock_status,documents_status=b.documents_status,consultation_status=b.consultation_status;
  if(!['unreviewed','available','unavailable'].includes(String(stock_status)))errors.stock_status='공급 검토 상태를 선택해 주세요.';
  if(!['unreviewed','ready','missing'].includes(String(documents_status)))errors.documents_status='서류 검토 상태를 선택해 주세요.';
  if(!['not_required','pending','communicated','agreed'].includes(String(consultation_status)))errors.consultation_status='협의 상태를 확인해 주세요.';
  const adjustments:ReviewInput['adjustments']=[];
  if(!Array.isArray(b.adjustments)||b.adjustments.length>100)errors.adjustments='조정 항목을 확인해 주세요.';
  else for(const raw of b.adjustments){const a=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
    if(typeof a.product_id!=='string'||typeof a.reason!=='string'||a.reason.trim().length<3||a.reason.length>1000||adjustments.some(v=>v.product_id===a.product_id)){errors.adjustments='품목별 조정 사유(3자 이상)와 중복 여부를 확인해 주세요.';continue;}
    try{usdMinor(a.unit_net_usd);}catch{errors.adjustments='조정 단가는 0보다 큰 USD 금액으로 입력해 주세요.';continue;}
    adjustments.push({product_id:a.product_id,unit_net_usd:String(a.unit_net_usd),reason:a.reason.trim()});
  }
  const result={stock_status,documents_status,consultation_status,
    lead_time_note:text('lead_time_note',1000),review_note:text('review_note',5000),change_reason:text('change_reason',1000,3),
    consultation_note:text('consultation_note',2000,adjustments.length&&['communicated','agreed'].includes(String(consultation_status))?10:0),adjustments};
  if(adjustments.length&&consultation_status==='not_required')errors.consultation_status='조정은 사전 안내·협의가 필요합니다.';
  if(Object.keys(errors).length)throw new InquiryValidationError(errors);
  return result as ReviewInput;
}
export function buildQuoteSnapshot(inquiry:CrmInquiry,review:ReviewInput,products:ProductItem[],sources:Record<string,{price:PriceRevision|null;issue?:string}>,rate:ExchangeRate|null,now=new Date()):QuoteSnapshot {
  const issues:string[]=[];
  if(inquiry.kind!=='export_rfq')throw new InquiryValidationError({kind:'해외 RFQ에서만 수출 견적 초안을 만듭니다.'});
  if(inquiry.incoterms!=='FOB'&&inquiry.incoterms!=='FOB Busan')issues.push('요청 인도조건은 '+inquiry.incoterms+'입니다. 자동 가격은 FOB 기준이므로 별도 검토가 필요합니다.');
  if(review.stock_status!=='available')issues.push('공급 가능 수량 검토 미완료');
  if(review.documents_status!=='ready')issues.push('요구 서류 검토 미완료');
  if(!review.lead_time_note)issues.push('납기 검토 미완료');
  if(review.adjustments.length&&review.consultation_status!=='agreed')issues.push('가격 조정 사전 협의 미완료');
  if(review.adjustments.some(a=>!inquiry.items.some(i=>i.product_id===a.product_id)))throw new InquiryValidationError({adjustments:'문의에 없는 상품을 조정할 수 없습니다.'});
  const lines=inquiry.items.map(item=>{
    const p=products.find(p=>p.id===item.product_id),source=sources[item.product_id],price=source?.price||null;
    let base=null,issue=source?.issue||null;
    if(!p)issue='상품이 더 이상 존재하지 않습니다.';
    if(!issue&&price)try{base=calculateLine(price,{product_id:item.product_id,unit:'CTN',quantity:item.quantity_cartons},'export',rate,now);}
      catch(e){if(e instanceof PricingError)issue=e.message;else throw e;}
    if(!base&&!issue)issue='승인 가격 확인 필요';
    const adjustment=review.adjustments.find(a=>a.product_id===item.product_id);
    const proposed=base?(adjustment?usdMinor(adjustment.unit_net_usd):base.unit_net_minor):null;
    const total=proposed===null?null:proposed*item.quantity_cartons;
    if(total!==null&&!Number.isSafeInteger(total))throw new InquiryValidationError({adjustments:'조정 금액이 허용 범위를 넘었습니다.'});
    if(issue)issues.push((p?.sku||item.product_id)+': '+issue);
    if(base&&inquiry.requested_loading_port&&inquiry.requested_loading_port.toLowerCase()!==base.loading_port?.toLowerCase())issues.push((p?.sku||item.product_id)+': 요청 선적항과 검수된 FOB 선적항이 다릅니다.');
    return {product_id:item.product_id,sku:p?.sku||item.product_id,name:p?.name_en||p?.name||item.product_name,quantity:item.quantity_cartons,price_source:price,base,
      proposed_unit_minor:proposed,proposed_total_minor:total,adjustment_reason:adjustment?.reason||null,issue};
  });
  const complete=lines.length>0&&lines.every(l=>!!l.base),sum=(key:'base'|'proposed')=>lines.reduce((n,l)=>n+(key==='base'?l.base!.total_minor:l.proposed_total_minor!),0);
  const baseTotal=complete?sum('base'):null,proposedTotal=complete?sum('proposed'):null;
  if([baseTotal,proposedTotal].some(n=>n!==null&&!Number.isSafeInteger(n)))throw new InquiryValidationError({adjustments:'합계가 허용 범위를 넘었습니다.'});
  return {kind:'quotation_draft',inquiry_id:inquiry.id,created_at:now.toISOString(),currency:'USD',incoterms:'FOB',
    notice:FOB_NOTICE+' Internal quotation draft only. Not issued to the buyer.',
    buyer:{company:inquiry.company,contact_name:inquiry.contact_name,country:inquiry.country,destination_port:inquiry.destination_port,company_id:inquiry.company_id,submitted_by:inquiry.submitted_by},
    requested:{incoterms:inquiry.incoterms,loading_port:inquiry.requested_loading_port,ship_date:inquiry.desired_ship_date,documents:inquiry.required_documents||[]},
    review,issues,base_total_minor:baseTotal,proposed_total_minor:proposedTotal,valid_until:complete?lines.map(l=>l.base!.valid_until).sort()[0]:null,exchange_rate:rate,lines};
}
