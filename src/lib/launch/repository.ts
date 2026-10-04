import 'server-only';
import {supabaseAdmin} from '../supabase-admin';
import {ApiError,textField} from '../request-security';
import {getBusinessSettings} from '../business-settings-server';
import {launchChecks,manualLaunchChecks} from './readiness';
import type {ServiceControls,ServiceState,LaunchFacts,LaunchStatus} from './types';
export async function serviceControls():Promise<ServiceControls>{
 const r=await supabaseAdmin.from('b2b_service_controls').select('revision,inquiries_paused,orders_paused,pi_paused,owner,owner_id,response_minutes,updated_at').eq('id',true).maybeSingle();
 if(r.error||!r.data)throw new ApiError(503,'서비스 운영 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
 return r.data as ServiceControls;
}
export async function assertTradeAvailable(kind:'inquiries'|'orders'|'pi'){
 const c=await serviceControls();
 if(c[(kind+'_paused') as keyof ServiceControls]===true)throw new ApiError(503,'현재 신규 거래 접수를 잠시 중지했습니다. 기존 기록은 확인할 수 있습니다. / New requests are temporarily paused. Existing records remain available.');
}
export function parseServiceControls(b:Record<string,unknown>):{revision:number;state:ServiceState;reason:string}{
 if(!Number.isInteger(b.revision)||Number(b.revision)<1||!b.state||typeof b.state!=='object'||Array.isArray(b.state))throw new ApiError(400,'설정 버전과 운영 상태를 확인해 주세요.');
 const s=b.state as Record<string,unknown>,keys=['inquiries_paused','orders_paused','pi_paused','owner_id','response_minutes'];
 if(Object.keys(s).length!==keys.length||Object.keys(s).some(k=>!keys.includes(k))||keys.slice(0,3).some(k=>typeof s[k]!=='boolean')||
 (s.owner_id!==null&&(typeof s.owner_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.owner_id)))||
 (s.response_minutes!==null&&(!Number.isInteger(s.response_minutes)||Number(s.response_minutes)<5||Number(s.response_minutes)>1440)))throw new ApiError(400,'운영 상태·담당자·대응 시간을 확인해 주세요.');
 return {revision:Number(b.revision),state:{inquiries_paused:s.inquiries_paused as boolean,orders_paused:s.orders_paused as boolean,pi_paused:s.pi_paused as boolean,owner_id:s.owner_id as string|null,response_minutes:s.response_minutes as number|null},reason:textField(b.reason,'변경 사유',500,3)};
}
export async function launchStatus(actor:string):Promise<LaunchStatus>{
 const [controls,business,facts,events,staff]=await Promise.all([serviceControls(),getBusinessSettings(),supabaseAdmin.rpc('b2b_launch_snapshot',{p_actor:actor}),
 supabaseAdmin.from('b2b_service_control_events').select('revision,reason,created_at,before_state,after_state').order('revision',{ascending:false}).limit(20),supabaseAdmin.rpc('b2b_staff_directory',{p_actor:actor})]);
 if(facts.error||!facts.data||events.error||staff.error||!Array.isArray(staff.data)||!business.revision)throw new ApiError(503,'오픈 점검 자료를 불러오지 못했습니다.');
 const validOwner=staff.data.some((s:{id:string})=>s.id===controls.owner_id);
 const displayControls={...controls,owner:validOwner?controls.owner:''};
 return {controls:displayControls,facts:facts.data as LaunchFacts,checks:launchChecks(facts.data,displayControls,business.profile),events:events.data||[],manual_checks:manualLaunchChecks,staff:staff.data};
}
