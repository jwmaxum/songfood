import type {BusinessProfile} from '@/lib/business-settings';
import type {Locale} from '@/lib/i18n/locale';
export default function BusinessContact({profile,language}:{profile:BusinessProfile;language:Locale}){
 const en=language==='en',address=en?profile.address_en||profile.address:profile.address;
 return <address className="mt-5 space-y-2 break-words text-sm not-italic leading-7">
 <p>{profile.name}{profile.owner&&' · '+(en?'Representative: ':'대표자: ')+profile.owner}</p>
 {profile.registration&&<p>{en?'Business registration: ':'사업자등록번호: '}{profile.registration}</p>}
 {profile.ecommerce_registration&&<p>{en?'E-commerce registration: ':'통신판매업 신고: '}{profile.ecommerce_registration}</p>}
 {address&&<p>{address}</p>}
 <p>{en?'Domestic enquiries: ':'국내 문의: '}<a className="underline" href={'tel:'+profile.phone.replace(/[^+0-9]/g,'')}>{profile.phone}</a></p>
 <p>Export: <a className="underline" href={'tel:'+profile.export_phone.replace(/[^+0-9]/g,'')}>{profile.export_phone}</a></p>
 <p><a className="underline" href={'mailto:'+profile.email}>{profile.email}</a></p>
 </address>;
}
