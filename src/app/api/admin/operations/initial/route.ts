import {initialOperations} from '@/lib/operations/initial-server';
import {json,failure} from '@/lib/request-security';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return json(await initialOperations(request));}catch(e){return failure(e);}}
