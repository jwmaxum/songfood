import 'server-only';
import {supabaseAdmin} from '../supabase-admin';
import {ApiError,textField,uuidField} from '../request-security';
import {databaseError} from '../crm/repository';
import {mailMessage} from '../../../supabase/functions/_shared/mail-message';
import type {MailPreview} from './types';
export async function mailPreview(request:Request,actor:string,id:string):Promise<MailPreview>{
 const r=await supabaseAdmin.rpc('b2b_mail_prepare',{p_actor:actor,p_id:id,p_action:'preview'});databaseError(r.error);
 if(!r.data)throw new ApiError(503,'메일 미리보기를 불러오지 못했습니다.');
 const message=mailMessage(r.data.origin);
 return {recipient:r.data.payload.recipient,subject:message.subject,link:message.link,text:message.text,hash:r.data.hash,delivery:r.data.delivery};
}
export function parseMailSend(body:Record<string,unknown>){
 if(body.confirmed!==true||typeof body.hash!=='string'||!/^[0-9a-f]{64}$/.test(body.hash)||body.hash.length!==64)throw new ApiError(400,'현재 수신자·메일 내용을 확인해 주세요.');
 return {request_key:uuidField(body.request_key),hash:body.hash,reason:textField(body.reason,'발송 사유',500,3)};
}
export async function callMailRelay(actor:string,action:'verify'|'send',data:Record<string,unknown>={}){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new ApiError(503,'메일 연결 설정이 필요합니다.');
 let r:Response;
 try{r=await fetch(url+'/functions/v1/b2b-notification-relay',{method:'POST',headers:{Authorization:'Bearer '+key,apikey:key,'Content-Type':'application/json'},body:JSON.stringify({...data,actor,action}),signal:AbortSignal.timeout(65000),cache:'no-store'});}catch{throw new ApiError(503,'메일 처리 응답을 확인하지 못했습니다. 발송 결과를 새로고침하고 관리자 확인 후 처리해 주세요.');}
 const b=await r.json().catch(()=>null);
 if(!r.ok)throw new ApiError(r.status===403?403:r.status===409?409:503,'메일 연결 또는 처리 상태를 확인해 주세요. 발송 결과 불명은 자동 재발송하지 않습니다.');
 return b;
}
