import {crmStaff,crmFailure,databaseError} from '@/lib/crm/repository';
import {documentById,downloadPi} from '@/lib/pi/repository';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {uuidField} from '@/lib/request-security';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{
 const staff=await crmStaff(request),doc=await documentById(uuidField((await params).id)),response=await downloadPi(doc);
 const event=await supabaseAdmin.from('b2b_pi_events').insert({document_id:doc.id,actor_id:staff.id,event:'staff_download',message:'Verified PDF download'});databaseError(event.error);return response;
}catch(e){return crmFailure(e);}}
