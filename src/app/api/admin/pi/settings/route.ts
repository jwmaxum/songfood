import {json,readJson} from '@/lib/request-security';
import {crmFailure} from '@/lib/crm/repository';
import {piAdmin} from '@/lib/pi/repository';
import {getPiSettings,savePiSettings} from '@/lib/pi/settings';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{await piAdmin(request);return json({settings:await getPiSettings()});}catch(e){return crmFailure(e);}}
export async function PUT(request:Request){try{const a=await piAdmin(request),b=await readJson(request,16384);return json({success:true,settings:await savePiSettings(request,a.id,b)});}catch(e){return crmFailure(e);}}
