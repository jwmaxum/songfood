import {crmStaff,crmFailure,listInquiries} from '@/lib/crm/repository';
import {json} from '@/lib/request-security';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  try{await crmStaff(request);return json({success:true,...await listInquiries(request)});}catch(e){return crmFailure(e);}
}
