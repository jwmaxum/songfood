import {assertTradeAvailable} from '@/lib/launch/repository';
import {requireStaff} from '@/lib/admin-auth';
import {InquiryValidationError,parseCommercialInquiry,inquiryFingerprint} from '@/lib/commercial-inquiry';
import {getProducts} from '@/lib/products-db';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {cookieToken} from '@/lib/auth-session';
import {assertApproved,requireCustomer} from '@/lib/customer-auth';
import {ApiError,digest,json,rateLimit,readJson,requireSameOrigin,uuidField} from '@/lib/request-security';
import {crmFailure,databaseError,listInquiries,crmStaff,changeInquiry} from '@/lib/crm/repository';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const denied=await requireStaff(request,['admin','inquiry_staff']);if(denied)return denied;
  try{return json({success:true,...await listInquiries(request)});}catch(e){return crmFailure(e);}
}
export async function POST(request:Request) {
  try{
    requireSameOrigin(request);
    const key=uuidField(request.headers.get('Idempotency-Key')),body=await readJson(request);
    if(body.website)throw new ApiError(400,'문의 내용을 확인해 주세요.');
    const inquiry=parseCommercialInquiry(body);
    let companyId:string|null=null,submittedBy:string|null=null;
    if(cookieToken(request,'customer')){const session=await requireCustomer(request);if(session.company)companyId=assertApproved(session);submittedBy=session.user.id;}
    const scope=await digest(JSON.stringify({user:submittedBy,company:companyId,email:inquiry.email}));
    const hash=await digest(inquiryFingerprint(inquiry));
    const previous=await supabaseAdmin.from('b2b_inquiry_requests').select('inquiry_id,request_hash').eq('scope_hash',scope).eq('request_key',key).maybeSingle();databaseError(previous.error);
    if(previous.data){if(previous.data.request_hash!==hash)throw new ApiError(409,'같은 요청 키에 다른 문의 내용이 있습니다.');return json({success:true,id:previous.data.inquiry_id,replayed:true});}
    await assertTradeAvailable('inquiries');
    await rateLimit(request,'inquiry',10,3600);
    if(inquiry.kind==='export_rfq'){
      const products=await getProducts(),names=new Map(products.map(p=>[p.id,p.name_en||p.name]));
      inquiry.items=inquiry.items.map((item,i)=>{const name=names.get(item.product_id);if(!name)throw new InquiryValidationError({['items.'+i]:'등록되지 않은 상품입니다. / Product unavailable.'});return {...item,product_name:name};});
    }
    const result=await supabaseAdmin.rpc('b2b_submit_inquiry',{p_scope:scope,p_key:key,p_hash:hash,p_data:{...inquiry,company_id:companyId,submitted_by:submittedBy}});
    databaseError(result.error);return json({success:true,...result.data},result.data.replayed?200:201);
  }catch(e){return crmFailure(e);}
}
export async function PATCH(request:Request) {
  try{const staff=await crmStaff(request),body=await readJson(request,8192);
    return json({success:true,result:await changeInquiry(staff.id,uuidField(body.id),{...body,action:'status'})});
  }catch(e){return crmFailure(e);}
}
