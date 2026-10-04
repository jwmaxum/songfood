import 'server-only';
import {ApiError,textField,uuidField} from '../request-security';
import {supabaseAdmin} from '../supabase-admin';
import {launchStatus} from './repository';
import {releaseSnapshot} from './releases';
import {HANDOVER_CHECKS,assessHandover,type HandoverData,type HandoverKey} from './handover';
export function parseHandover(b:Record<string,unknown>){
 const keys=['check_id','revision','basis','result','notes','reference_id','received'];
 if(Object.keys(b).length!==keys.length||Object.keys(b).some(k=>!keys.includes(k))||!HANDOVER_CHECKS.some(c=>c.id===b.check_id)||!Number.isSafeInteger(b.revision)||Number(b.revision)<0||typeof b.basis!=='string'||!/^[0-9a-f]{64}$/.test(b.basis)||!['passed','blocked'].includes(String(b.result))||typeof b.received!=='boolean')throw new ApiError(400,'인수 검수 항목·버전·결과를 확인해 주세요.');
 const notes=textField(b.notes,'검수 근거·미완료 사유',1500,10);
 if(/[<>\u0000-\u001f]/.test(notes))throw new ApiError(400,'검수 근거에는 일반 텍스트만 입력해 주세요.');
 const key=b.check_id as HandoverKey,needsReference=['domestic','export','document_mail'].includes(key),reference=b.reference_id===null?null:uuidField(b.reference_id);
 if(reference&&!needsReference||b.result==='passed'&&needsReference&&!reference||b.result==='passed'&&['auth_mail','document_mail'].includes(key)&&!b.received)throw new ApiError(400,'실제 거래·알림 ID와 메일 수신 확인을 입력해 주세요.');
 return {p_check:key,p_revision:Number(b.revision),p_hash:b.basis,p_result:b.result,p_notes:notes,p_reference:reference,p_received:b.received};
}
export async function handoverSnapshot(actor:string):Promise<HandoverData>{
 const r=await supabaseAdmin.rpc('b2b_handover_snapshot',{p_actor:actor});
 if(r.error||!r.data)throw new ApiError(503,'업무 인수 자료를 불러오지 못했습니다.');
 const data=r.data as HandoverData;
 if(data.role==='admin'){const [launch,release]=await Promise.all([launchStatus(actor),releaseSnapshot(actor,'admin')]);data.assessment=assessHandover(data,launch.checks,launch.controls,release.products);}
 return data;
}
export function handoverError(error:{code?:string}|null){
 if(!error)return;
 if(error.code==='40001')throw new ApiError(409,'운영 자료나 검수 기록이 바뀌었습니다. 최신 상태를 불러온 뒤 재검수해 주세요.');
 if(error.code==='42501')throw new ApiError(403,'현재 업무 권한으로 검수할 수 없습니다.');
 if(error.code==='22023')throw new ApiError(400,'실제 완료 거래·수락 PI·SMTP 접수와 수신 확인 또는 필수 운영 설정을 확인해 주세요.');
 throw new ApiError(503,'인수 검수 기록을 저장하지 못했습니다.');
}
