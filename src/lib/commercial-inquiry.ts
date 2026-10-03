export type InquiryKind = 'export_rfq' | 'domestic_wholesale';
export type InquiryStatus = 'new' | 'reviewing' | 'responded' | 'closed';
export const INQUIRY_STATUSES: InquiryStatus[] = ['new', 'reviewing', 'responded', 'closed'];
export const INQUIRY_STATUS_LABELS: Record<InquiryStatus,string> = {new:'접수됨',reviewing:'검토 중',responded:'회신 완료',closed:'종결'};
export type InquiryItem = {product_id:string;product_name:string;quantity_cartons:number};
export class InquiryValidationError extends Error {
  constructor(public fields:Record<string,string>) {super('입력 항목을 확인해 주세요. / Please review the highlighted fields.');}
}
export function parseCommercialInquiry(input:unknown) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new InquiryValidationError({form:'문의 내용을 확인해 주세요.'});
  const body=input as Record<string,unknown>,errors:Record<string,string>={};
  function text(key:string,max:number,required=false) {
    const raw=body[key];
    if(raw!==undefined&&raw!==null&&typeof raw!=='string'){errors[key]='문자열을 입력해 주세요. / Enter text.';return '';}
    const value=typeof raw==='string'?raw.trim():'';
    if(value.length>max)errors[key]=max+'자 이내로 입력해 주세요. / Text is too long.';
    if(required&&!value)errors[key]='필수 항목입니다. / Required.';
    return value;
  }
  const kind=body.kind;
  if(kind!=='export_rfq'&&kind!=='domestic_wholesale')errors.kind='문의 종류가 올바르지 않습니다.';
  const company=text('company',200),contact_name=text('contact_name',120,true),email=text('email',254,true).toLowerCase();
  const phone=text('phone',50,kind==='domestic_wholesale');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))errors.email='이메일 주소를 확인해 주세요. / Enter a valid email.';
  const country=text('country',100,kind==='export_rfq'),term=text('incoterms',30,kind==='export_rfq');
  const incoterms=term==='FOB Busan'?'FOB':term;
  if(kind==='export_rfq'&&!['FOB','CIF','CFR','EXW'].includes(incoterms))errors.incoterms='인도조건을 확인해 주세요.';
  const items:InquiryItem[]=[],seen=new Set<string>();
  if(kind==='export_rfq') {
    if(!Array.isArray(body.items)||body.items.length<1||body.items.length>100)errors.items='1~100개 상품을 선택해 주세요. / Select 1–100 products.';
    else body.items.forEach((raw,i)=>{
      const row=raw&&typeof raw==='object'?raw as Record<string,unknown>:{},id=typeof row.product_id==='string'?row.product_id.trim():'';
      const quantity=row.quantity_cartons;
      if(!id||id.length>100||seen.has(id))errors['items.'+i]='중복 또는 잘못된 상품입니다. / Invalid or duplicate product.';
      else if(typeof quantity!=='number'||!Number.isInteger(quantity)||quantity<1||quantity>100000)errors['items.'+i]='수량은 1~100,000 정수입니다. / Enter a whole number from 1 to 100,000.';
      else {seen.add(id);items.push({product_id:id,product_name:typeof row.product_name==='string'?row.product_name.trim().slice(0,200):'',quantity_cartons:quantity});}
    });
  }
  const requested_loading_port=text('requested_loading_port',120);
  const desired_ship_date=text('desired_ship_date',10);
  if(desired_ship_date&&(!/^\d{4}-\d{2}-\d{2}$/.test(desired_ship_date)||!Number.isFinite(Date.parse(desired_ship_date))||new Date(desired_ship_date).toISOString().slice(0,10)!==desired_ship_date))
    errors.desired_ship_date='날짜를 확인해 주세요. / Enter a valid date.';
  let required_documents:string[]=[];
  if(body.required_documents!==undefined) {
    if(!Array.isArray(body.required_documents)||body.required_documents.length>20||body.required_documents.some(v=>typeof v!=='string'||!v.trim()||v.trim().length>120))
      errors.required_documents='서류명은 120자, 최대 20개입니다. / Up to 20 document names.';
    else required_documents=[...new Set(body.required_documents.map(v=>(v as string).trim()))];
  }
  const result={
    kind:kind as InquiryKind,company:company||(kind==='domestic_wholesale'?'개인 구매':'Individual buyer'),contact_name,email,phone:phone||null,
    business_type:text('business_type',100)||null,
    business_registration_no:kind==='domestic_wholesale'?text('business_registration_no',50)||null:null,
    country:kind==='export_rfq'?country:null,destination_port:kind==='export_rfq'?text('destination_port',120)||null:null,
    incoterms:kind==='export_rfq'?incoterms:null,
    estimated_monthly_volume:kind==='domestic_wholesale'?text('estimated_monthly_volume',100)||null:null,
    requested_loading_port:kind==='export_rfq'?requested_loading_port||null:null,
    desired_ship_date:kind==='export_rfq'?desired_ship_date||null:null,
    required_documents:kind==='export_rfq'?required_documents:[],
    items,notes:text('notes',10000)||null,
  };
  if(Object.keys(errors).length)throw new InquiryValidationError(errors);
  return result;
}
export type ParsedInquiry=ReturnType<typeof parseCommercialInquiry>;
export function inquiryFingerprint(inquiry:ParsedInquiry) {
  // Names come from the catalogue and must not change the replay identity.
  return JSON.stringify({...inquiry,items:inquiry.items.map(({product_id,quantity_cartons})=>({product_id,quantity_cartons})).sort((a,b)=>a.product_id.localeCompare(b.product_id))});
}
