import {crmStaff,crmFailure,detail,changeInquiry,saveQuote} from '@/lib/crm/repository';
import {json,readJson,uuidField} from '@/lib/request-security';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context) {
  try{await crmStaff(request);return json({success:true,...await detail(uuidField((await params).id))});}catch(e){return crmFailure(e);}
}
export async function POST(request:Request,{params}:Context) {
  try{const staff=await crmStaff(request),id=uuidField((await params).id),body=await readJson(request,65536);
    if(body.action==='quote')return json({success:true,quote:await saveQuote(staff.id,id,body)},201);
    return json({success:true,result:await changeInquiry(staff.id,id,body)});
  }catch(e){return crmFailure(e);}
}
