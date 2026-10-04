import {isAuthConfigured} from '@/lib/supabase-admin';
import {serviceControls} from '@/lib/launch/repository';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  if(!isAuthConfigured())throw new Error('unconfigured');
  await serviceControls();
  return Response.json({status:'ok'},{headers:{'Cache-Control':'no-store'}});
 }catch{
  console.error(JSON.stringify({event:'songfood_health_unavailable',status:503}));
  return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
