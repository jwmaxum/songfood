import {snapshot} from '@/lib/operations/repository';
import {json,failure} from '@/lib/request-security';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return json({success:true,...await snapshot(request,'contacts')});}catch(e){return failure(e);}}
