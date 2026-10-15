import {ApiError,textField,uuidField} from '../request-security';
import {PRODUCT_DRAFT_FIELDS,PRODUCT_DRAFT_TEXT_FIELDS,PRODUCT_DRAFT_NUMBER_FIELDS,PRODUCT_DRAFT_BOOLEAN_FIELDS,PRODUCT_DRAFT_ARRAY_FIELDS,type ProductDraftData,type ProductSourceNotes} from './types';
const has=(fields:readonly string[],key:string)=>fields.includes(key);
const object=(value:unknown)=>!!value&&typeof value==='object'&&!Array.isArray(value);
function clean(value:unknown,max:number):string {
 if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw new ApiError(400,'상품 입력 형식 또는 길이를 확인해 주세요.');
 return value.normalize('NFC');
}
export function parseDraftData(value:unknown):ProductDraftData {
 if(!object(value)||JSON.stringify(value).length>65536)throw new ApiError(400,'상품 초안 형식을 확인해 주세요.');
 const result:Record<string,unknown>={};
 for(const [key,v]of Object.entries(value as Record<string,unknown>)){
  if(!has(PRODUCT_DRAFT_FIELDS,key))throw new ApiError(400,'허용되지 않은 상품 항목입니다.');
  if(v===null){result[key]=null;continue;}
  if(has(PRODUCT_DRAFT_TEXT_FIELDS,key)){
   const text=clean(v,['description','ingredients','allergens'].includes(key)?10000:2048);
   if(key==='image_url'&&text){
    if(text.startsWith('/')){if(text.startsWith('//')||text.includes('\\')||/[\r\n\t]/.test(text))throw new ApiError(400,'이미지 주소를 확인해 주세요.');}
    else{let url:URL;try{url=new URL(text);}catch{throw new ApiError(400,'이미지 주소를 확인해 주세요.');}if(url.protocol!=='https:'||url.username||url.password)throw new ApiError(400,'이미지 주소를 확인해 주세요.');}
   }
   result[key]=text;
  }else if(has(PRODUCT_DRAFT_NUMBER_FIELDS,key)){
   if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>9999999999.99||(['stock','carton_qty','moq_cartons','deal_discount_percent'].includes(key)&&!Number.isSafeInteger(v))||(key==='deal_discount_percent'&&v>100))throw new ApiError(400,'숫자 항목을 확인해 주세요.');
   result[key]=v;
  }else if(has(PRODUCT_DRAFT_BOOLEAN_FIELDS,key)){
   if(typeof v!=='boolean')throw new ApiError(400,'선택 항목을 확인해 주세요.');result[key]=v;
  }else if(has(PRODUCT_DRAFT_ARRAY_FIELDS,key)){
   if(key==='images'){
    if(!Array.isArray(v)||v.length>6||new Set(v).size!==v.length)throw new ApiError(400,'상품 사진은 중복 없이 최대 6개까지 등록할 수 있습니다.');
    const images=v.map(x=>{
     const url=clean(x,2048);
     if(!url||/[\s\\]/.test(url)||url.startsWith('//'))throw new ApiError(400,'상품 이미지 주소를 확인해 주세요.');
     if(url.startsWith('/'))return url;
     let parsed:URL;try{parsed=new URL(url);}catch{throw new ApiError(400,'상품 이미지 주소를 확인해 주세요.');}
     if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw new ApiError(400,'상품 이미지 주소를 확인해 주세요.');return url;
    });
    if(new Set(images).size!==images.length)throw new ApiError(400,'상품 사진은 중복 없이 등록해 주세요.');
    result[key]=images;
   }else{
    if(!Array.isArray(v)||v.length>30)throw new ApiError(400,'목록 항목을 확인해 주세요.');result[key]=v.map(x=>clean(x,250));
   }
  }
 }
 return result as ProductDraftData;
}
function revision(value:unknown,min=0){if(!Number.isSafeInteger(value)||Number(value)<min||Number(value)>2147483646)throw new ApiError(400,'초안 버전을 확인해 주세요.');return Number(value);}
function exact(body:Record<string,unknown>,keys:string[]){if(Object.keys(body).some(k=>!keys.includes(k)))throw new ApiError(400,'허용되지 않은 요청 항목입니다.');}
export function productId(value:unknown):string|null{
 if(value===null)return null;if(typeof value!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(value))throw new ApiError(400,'상품 식별자를 확인해 주세요.');return value;
}
export function parseDraftSave(body:Record<string,unknown>){
 exact(body,['id','product_id','revision','base_hash','data','source_notes','reason','rebase']);
 const id=body.id==null?null:uuidField(body.id),product_id=productId(body.product_id);
 if(body.rebase!==undefined&&typeof body.rebase!=='boolean')throw new ApiError(400,'재대조 확인을 확인해 주세요.');
 const base_hash=body.base_hash==null?null:body.base_hash;
 if(base_hash!==null&&(typeof base_hash!=='string'||!/^[0-9a-f]{64}$/.test(base_hash)))throw new ApiError(400,'원본 상품 버전을 확인해 주세요.');
 if(!object(body.source_notes)||Object.keys(body.source_notes as object).some(k=>!['specification','label','sales_terms'].includes(k)))throw new ApiError(400,'자료 출처를 확인해 주세요.');
 const source_notes=Object.fromEntries(Object.entries(body.source_notes as Record<string,unknown>).map(([k,v])=>[k,clean(v,6000)])) as Partial<ProductSourceNotes>;
 return {id,product_id,rebase:body.rebase===true,revision:revision(body.revision),base_hash:base_hash as string|null,data:parseDraftData(body.data),source_notes,reason:textField(body.reason,'저장 사유',1000,3)};
}
export function parseDraftPublish(body:Record<string,unknown>){
 exact(body,['id','revision','reason']);return {id:uuidField(body.id),revision:revision(body.revision,1),reason:textField(body.reason,'공개 반영 사유',1000,3)};
}
