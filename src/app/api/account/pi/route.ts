import {customerInquiries} from '@/lib/customer-auth';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {crmFailure,databaseError} from '@/lib/crm/repository';
import {publicPi} from '@/lib/pi/repository';
import {json} from '@/lib/request-security';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const inquiries=await customerInquiries(request);if(!inquiries.length)return json({documents:[]});
 const r=await supabaseAdmin.from('b2b_pi_documents').select('*').in('inquiry_id',inquiries.map(i=>i.id)).in('status',['issued','superseded']).order('created_at',{ascending:false}).limit(100);databaseError(r.error);
 return json({documents:(r.data||[]).map(publicPi)});
}catch(e){return crmFailure(e);}}
