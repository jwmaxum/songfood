import 'server-only';
import {supabaseAdmin} from '../supabase-admin';
import {ApiError} from '../request-security';
import {opsStaff,snapshot} from './repository';
import {handoverSnapshot} from '../launch/handover-server';
import type {InitialOperations} from './initial';
export async function initialOperations(request:Request):Promise<InitialOperations>{
 const actor=await opsStaff(request);
 const r=await supabaseAdmin.rpc('b2b_initial_operations',{p_actor:actor.id});
 if(r.error?.code==='42501')throw new ApiError(403,'현재 직원 권한을 확인해 주세요.');
 if(r.error||!r.data)throw new ApiError(503,'초기 운영 자료를 불러오지 못했습니다.');
 const data=r.data as InitialOperations;
 if(data.role!==actor.role)throw new ApiError(403,'직원 권한이 변경되었습니다. 다시 로그인해 주세요.');
 const [quality,handover]=await Promise.all([
  ['admin','product_staff'].includes(actor.role)?snapshot(new Request(new URL('/api/admin/operations/quality',request.url),{headers:request.headers}),'quality'):null,
  actor.role==='admin'?handoverSnapshot(actor.id):null,
 ]);
 if(quality){if(quality.role!==actor.role)throw new ApiError(403,'직원 권한이 변경되었습니다. 다시 로그인해 주세요.');data.quality={counts:quality.counts||{},as_of:quality.as_of,rate_alert:quality.rate_alert||''};}
 if(handover){if(handover.role!==actor.role)throw new ApiError(403,'직원 권한이 변경되었습니다. 다시 로그인해 주세요.');data.assessment=handover.assessment;}
 return data;
}
