import {customerAction,customerDocument,downloadPi} from '@/lib/pi/repository';
import {crmFailure} from '@/lib/crm/repository';
import {uuidField} from '@/lib/request-security';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{
 const id=uuidField((await params).id),{doc}=await customerDocument(request,id),response=await downloadPi(doc);
 await customerAction(request,id,{action:'download',request_key:crypto.randomUUID()});return response;
}catch(e){return crmFailure(e);}}
