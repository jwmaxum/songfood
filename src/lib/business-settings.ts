export const businessFields = {
 name:['회사명','Company name',120], owner:['대표자','Representative',100],
 registration:['사업자등록번호','Business registration',40], ecommerce_registration:['통신판매업 신고번호','E-commerce registration',100],
 address:['사업장 주소','Business address',500], address_en:['사업장 주소 (영문)','Business address (English)',500],
 phone:['국내 문의 전화','Domestic phone',40], email:['고객 문의 이메일','Contact email',254], export_phone:['수출 문의 전화','Export phone',40],
 privacy_contact:['개인정보 담당자·연락처','Privacy contact',500],
 shipping_ko:['배송 기준 (한국어)','Delivery policy (Korean)',3000], shipping_en:['배송 기준 (영어)','Delivery policy (English)',3000],
 returns_ko:['반품·취소 기준 (한국어)','Returns policy (Korean)',3000], returns_en:['반품·취소 기준 (영어)','Returns policy (English)',3000],
 privacy_ko:['보유기간·위탁·국외 이전·권리행사 세부사항 (한국어)','Privacy details (Korean)',6000],
 privacy_en:['보유기간·위탁·국외 이전·권리행사 세부사항 (영어)','Privacy details (English)',6000],
} as const;
export type BusinessField = keyof typeof businessFields;
export type BusinessProfile = Record<BusinessField,string>;
export type BusinessSettings = {profile:BusinessProfile;revision:number;updated_at:string|null};
export const initialBusinessProfile:BusinessProfile = {
 name:'송영민푸드',owner:'',registration:'',ecommerce_registration:'',address:'',address_en:'',
 phone:'010-3889-3344',email:'3song876@daum.net',export_phone:'+82-10-2143-2120',
 privacy_contact:'',shipping_ko:'',shipping_en:'',returns_ko:'',returns_en:'',privacy_ko:'',privacy_en:'',
};
export function businessGaps(profile:BusinessProfile):BusinessField[] {
 return (Object.keys(businessFields) as BusinessField[]).filter(key=>!profile[key].trim());
}
