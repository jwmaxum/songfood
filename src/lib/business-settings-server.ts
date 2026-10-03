import 'server-only';
import {cache} from 'react';
import {isAuthConfigured,supabaseAdmin} from './supabase-admin';
import {ApiError,textField} from './request-security';
import {businessFields,initialBusinessProfile,type BusinessProfile,type BusinessSettings,type BusinessField} from './business-settings';
export const getBusinessSettings = cache(async ():Promise<BusinessSettings>=>{
 if (isAuthConfigured()) {
   const {data,error} = await supabaseAdmin.from('b2b_business_settings').select('profile,revision,updated_at').eq('id',true).maybeSingle();
   if (!error && data) return data as BusinessSettings;
 }
 return {profile:{...initialBusinessProfile},revision:0,updated_at:null};
});
export function validateBusinessSettings(body:Record<string,unknown>) {
 if (!Number.isSafeInteger(body.revision) || Number(body.revision)<1) throw new ApiError(400,'설정을 다시 불러온 후 저장해 주세요.');
 const value=body.profile;
 if (!value || typeof value!=='object' || Array.isArray(value)) throw new ApiError(400,'사업자 정보를 확인해 주세요.');
 const input=value as Record<string,unknown>;
 if(Object.keys(input).some(key=>!Object.hasOwn(businessFields,key)))throw new ApiError(400,'허용되지 않은 설정 항목입니다.');
 const profile={} as BusinessProfile;
 for (const key of Object.keys(businessFields) as BusinessField[]) {
   const [label,,max]=businessFields[key];
   profile[key]=textField(input[key],label,max,['name','phone','email','export_phone'].includes(key)?1:0);
   if (/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(profile[key])) throw new ApiError(400,label+'에는 일반 텍스트만 입력해 주세요.');
 }
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))throw new ApiError(400,'문의 이메일을 확인해 주세요.');
 for(const key of ['phone','export_phone'] as const)if(!/^\+?[0-9() .-]{7,40}$/.test(profile[key]))throw new ApiError(400,'전화번호를 확인해 주세요.');
 return {profile,revision:Number(body.revision),reason:textField(body.reason,'변경 사유',500,3)};
}
