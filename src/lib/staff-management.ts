import 'server-only';
import {supabaseAdmin} from './supabase-admin';
import {ApiError,emailField,textField,uuidField} from './request-security';
import type {StaffRole} from './admin-auth';
export const staffRoles:StaffRole[]=['admin','product_staff','inquiry_staff','order_staff'];
export type StaffOption={id:string;name:string;email:string;role:StaffRole};
export type StaffRecord=StaffOption&{status:'active'|'suspended';revision:number;verified:boolean;auth_active:boolean;created_at:string};
export type StaffSnapshot={super_admin_id:string;data:StaffRecord[];events:{id:string;staff_id:string;event:string;reason:string;created_at:string;before_state:Record<string,unknown>|null;after_state:Record<string,unknown>}[]};
function plain(v:unknown,label:string,max:number,min=1){const s=textField(v,label,max,min);if(/[<>\x00-\x1f]/.test(s))throw new ApiError(400,label+'에는 일반 텍스트를 입력해 주세요.');return s;}
export function staffMutation(body:Record<string,unknown>,action:'register'|'update'|'remove'){
 const allowed=action==='register'?['email','name','role','reason']:action==='update'?['id','revision','name','role','status','reason']:['id','revision','reason','confirmed'];
 if(Object.keys(body).some(k=>!allowed.includes(k)))throw new ApiError(400,'허용되지 않은 직원 정보입니다.');
 const reason=plain(body.reason,'변경 사유',500,3);
 const result:{p_action:string;p_id:string|null;p_email:string|null;p_revision:number|null;p_name:string|null;p_role:string|null;p_status:string|null;p_reason:string}={p_action:action,p_id:null,p_email:null,p_revision:null,p_name:null,p_role:null,p_status:null,p_reason:reason};
 if(action==='register')result.p_email=emailField(body.email);
 else {result.p_id=uuidField(body.id);if(!Number.isSafeInteger(body.revision)||Number(body.revision)<1)throw new ApiError(400,'직원 목록을 다시 불러와 주세요.');result.p_revision=Number(body.revision);}
 if(action==='remove'){if(body.confirmed!==true)throw new ApiError(400,'직원 권한 삭제를 확인해 주세요.');return result;}
 result.p_name=plain(body.name,'직원 이름',120);
 if(typeof body.role!=='string'||!staffRoles.includes(body.role as StaffRole))throw new ApiError(400,'직원 역할을 선택해 주세요.');
 result.p_role=body.role;result.p_status=action==='register'?'active':String(body.status);
 if(!['active','suspended'].includes(result.p_status))throw new ApiError(400,'직원 상태를 확인해 주세요.');
 return result;
}
export function staffError(error:{code?:string}|null){
 if(!error)return;
 if(error.code==='42501')throw new ApiError(403,'최고관리자만 직원 정보를 관리할 수 있습니다. 최고관리자 권한은 수정·삭제할 수 없습니다.');
 if(error.code==='40001')throw new ApiError(409,'직원 정보가 변경되었습니다. 다시 불러온 후 처리해 주세요.');
 if(error.code==='23505')throw new ApiError(409,'이미 등록된 직원입니다. 목록에서 수정해 주세요.');
 if(error.code==='22023')throw new ApiError(400,'이메일 인증이 완료된 계정과 입력 정보를 확인해 주세요.');
 if(error.code==='P0002')throw new ApiError(404,'등록된 직원을 찾을 수 없습니다.');
 throw new ApiError(503,'직원 정보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
}
export async function isSuperAdmin(id:string){const r=await supabaseAdmin.rpc('b2b_is_super_admin',{p_actor:id});if(r.error)throw new ApiError(503,'최고관리자 권한을 확인하지 못했습니다.');return r.data===true;}
export async function staffSnapshot(actor:string):Promise<StaffSnapshot>{const r=await supabaseAdmin.rpc('b2b_staff_snapshot',{p_actor:actor});staffError(r.error);if(!r.data)throw new ApiError(503,'직원 목록을 불러오지 못했습니다.');return r.data;}
