'use client';
import type {TargetCountry} from '@/types/label';
export interface BuyerFormData {companyName:string;registrationNumber:string;address:string;cityStateZip:string;country:string;contactPerson:string;phone:string;email:string;poNumber?:string;}
export const emptyBuyer:BuyerFormData={companyName:'',registrationNumber:'',address:'',cityStateZip:'',country:'',contactPerson:'',phone:'',email:'',poNumber:''};
const fields:{key:keyof BuyerFormData;label:string;max:number}[]=[
 {key:'companyName',label:'수입사 / 유통사 명 (Importer Company Name)',max:200},{key:'registrationNumber',label:'현지 등록 번호 (License / Reg No, 해당 시)',max:200},
 {key:'address',label:'사업장 주소 (Street Address)',max:600},{key:'cityStateZip',label:'도시 / 주 / 우편번호 (City, State, Zip)',max:200},
 {key:'country',label:'수입 대상국 (Country)',max:100},{key:'contactPerson',label:'담당자 성명·직책 (Contact Person & Title)',max:200},
 {key:'email',label:'이메일 (Email)',max:254},{key:'phone',label:'전화번호 (Phone)',max:80},{key:'poNumber',label:'발주 번호 (PO Number, 해당 시)',max:100},
];
export default function BuyerToFillForm({targetCountry,data,onChange}:{targetCountry:TargetCountry;data:BuyerFormData;onChange:(field:keyof BuyerFormData,value:string)=>void}){
 return <section className="no-print-area space-y-4 rounded-xl border border-stone-800 bg-[#12121c] p-5"><h3 className="font-bold">Buyer to Fill · {targetCountry} 실제 바이어 정보</h3><p className="text-sm leading-7 text-stone-300">확인한 실제 바이어 정보만 입력하세요. 미입력 항목은 문서에 BUYER TO FILL로 표시됩니다. 등록 번호 입력은 등록·통관 적합성의 증명이 아닙니다. 화면 입력은 새로고침하면 초기화됩니다.</p>
 <div className="grid gap-4 md:grid-cols-2">{fields.map(({key,label,max})=><label key={key} className="block text-sm" htmlFor={'buyer-'+key}>{label}<input id={'buyer-'+key} type={key==='email'?'email':'text'} maxLength={max} value={data[key]||''} onChange={e=>onChange(key,e.target.value)} className="mt-2 w-full min-w-0 rounded border border-stone-600 bg-stone-900 p-3 text-white"/></label>)}</div></section>;
}
