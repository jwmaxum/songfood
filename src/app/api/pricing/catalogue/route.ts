import { requireCustomer } from '@/lib/customer-auth';
import { json } from '@/lib/request-security';
import { catalogue, pricingFailure } from '@/lib/pricing/repository';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  try { return json({success:true,products:await catalogue(await requireCustomer(request))}); }
  catch(error) { return pricingFailure(error); }
}
