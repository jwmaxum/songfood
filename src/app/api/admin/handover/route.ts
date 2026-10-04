import {opsStaff} from '@/lib/operations/repository';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {json,failure,readJson,rateLimit} from '@/lib/request-security';
import {handoverSnapshot,parseHandover,handoverError} from '@/lib/launch/handover-server';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const a=await opsStaff(request);return json(await handoverSnapshot(a.id));}catch(e){return failure(e);}}
export async function PUT(request:Request){try{const a=await opsStaff(request),v=parseHandover(await readJson(request,8192));await rateLimit(request,'handover-review',30,900,a.id);const r=await supabaseAdmin.rpc('b2b_save_handover',{p_actor:a.id,...v});handoverError(r.error);return json({success:true});}catch(e){return failure(e);}}
