import {customerAction,customerDocument,publicPi} from '@/lib/pi/repository';
import {crmFailure} from '@/lib/crm/repository';
import {json,readJson,requireSameOrigin,uuidField} from '@/lib/request-security';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){try{
 const id=uuidField((await params).id),{doc}=await customerDocument(request,id);
 await customerAction(request,id,{action:'view',request_key:crypto.randomUUID()});
 return json({document:publicPi(doc)});
}catch(e){return crmFailure(e);}}
export async function POST(request:Request,{params}:Context){try{
 requireSameOrigin(request);return json({success:true,document:await customerAction(request,uuidField((await params).id),await readJson(request,4096))});
}catch(e){return crmFailure(e);}}
