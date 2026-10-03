import 'server-only';
import {getStaffIdentity,type StaffRole} from '../admin-auth';
import {supabaseAdmin} from '../supabase-admin';
import {ApiError,requireSameOrigin} from '../request-security';
import {orderError} from '../orders/repository';
import {opsQuery} from './validation';
import {qualitySnapshot,type QualityInput} from './quality';
import type {Mode} from './types';
export async function opsStaff(request:Request,roles:StaffRole[]=['admin','product_staff','inquiry_staff','order_staff']){
 if(!['GET','HEAD'].includes(request.method))requireSameOrigin(request,true);
 const actor=await getStaffIdentity(request);if(!actor||!roles.includes(actor.role))throw new ApiError(403,'업무 담당자 권한이 필요합니다.');return actor;
}
export async function snapshot(request:Request,mode:Mode){
 const roles:StaffRole[]=mode==='quality'?['admin','product_staff']:mode==='documents'?['admin','inquiry_staff']:['contacts','audit'].includes(mode)?['admin']:['admin','product_staff','inquiry_staff','order_staff'];
 const actor=await opsStaff(request,roles),query=opsQuery(request.url,mode);
 const r=await supabaseAdmin.rpc('b2b_ops_snapshot',{p_actor:actor.id,p_mode:mode,...query});orderError(r.error);
 if(!r.data)throw new ApiError(503,'운영 자료를 불러오지 못했습니다.');
 return mode==='quality'?{...qualitySnapshot(r.data as QualityInput,query.p_q,query.p_category,query.p_page),role:actor.role}:r.data;
}
