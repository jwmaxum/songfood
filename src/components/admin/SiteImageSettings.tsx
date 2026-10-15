'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import ImageUploadField from './ImageUploadField';
import {SITE_IMAGE_FIELDS} from '@/lib/site-images';
import {storedMediaImageAddress} from '@/lib/media-image-url';
import type {ContentBlock} from '@/lib/types';

export default function SiteImageSettings(){
 const router=useRouter();
 const [values,setValues]=useState<Record<string,string>>({});
 const [ready,setReady]=useState(false),[uploading,setUploading]=useState(false);
 const [saving,setSaving]=useState(''),[message,setMessage]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let live=true;
  fetch('/api/content-blocks',{cache:'no-store'}).then(async response=>{
   const body=await response.json();
   if(!response.ok||!body.success||!Array.isArray(body.data))throw Error();
   if(live){
    setValues(Object.fromEntries(SITE_IMAGE_FIELDS.map(field=>[field.key,(body.data as ContentBlock[]).find(row=>row.section_key===field.key)?.media_url||''])));
    setReady(true);setMessage('');
   }
  }).catch(()=>{if(live)setMessage('공통 이미지를 불러오지 못했습니다. 다시 시도해 주세요.');});
  return()=>{live=false;};
 },[retry]);
 async function save(key:string){
  if(!ready||uploading||saving)return;
  const field=SITE_IMAGE_FIELDS.find(item=>item.key===key);if(!field)return;
  const value=values[key]||'';
  if(value&&!storedMediaImageAddress(value)){setMessage('공통 이미지에는 직접 업로드한 이미지를 선택해 주세요.');return;}
  setSaving(key);setMessage('');
  try{
   const response=await fetch('/api/content-blocks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({section_key:key,page:field.collection?'collections':'branding',title:field.label,media_url:value,media_type:'image'})});
   const body=await response.json();if(!response.ok||!body.success)throw Error();
   setMessage(field.label+' 이미지를 저장했습니다.');router.refresh();
  }catch{setMessage('저장에 실패했습니다. 선택한 이미지는 유지됩니다. 다시 저장해 주세요.');}
  finally{setSaving('');}
 }
 return <section id="site-images" aria-labelledby="site-images-title" className="space-y-4 rounded-xl border border-stone-700 bg-stone-900 p-5 text-stone-100">
  <h2 id="site-images-title" className="text-xl font-bold">공통 이미지 · 로고와 상품 분류</h2>
  <p className="text-sm leading-6 text-stone-300">로고는 사이트와 인증메일에, 분류 사진은 고객의 카테고리 탐색에 사용합니다. 파일을 선택한 뒤 해당 이미지의 저장 버튼을 눌러 반영하세요. 선택을 지우고 저장하면 로고는 기본 이미지로, 분류는 사진 없는 표시로 돌아갑니다.</p>
  {message&&<p role="status" className="rounded border border-amber-500 p-3 text-sm">{message}</p>}
  {!ready?<button type="button" onClick={()=>setRetry(value=>value+1)} className="min-h-11 rounded border px-4">공통 이미지 다시 불러오기</button>:<div className="grid gap-5 lg:grid-cols-2">
   {SITE_IMAGE_FIELDS.map(field=><div key={field.key} className="space-y-3 rounded border border-stone-600 p-4">
    <ImageUploadField label={field.label} value={values[field.key]||''} onChange={url=>setValues(old=>({...old,[field.key]:url}))} disabled={uploading||!!saving} onBusyChange={setUploading}/>
    <button type="button" disabled={uploading||!!saving} onClick={()=>void save(field.key)} className="min-h-11 rounded bg-amber-300 px-4 font-bold text-stone-950 disabled:opacity-40">{saving===field.key?'저장 중…':field.label+' 이미지 저장'}</button>
   </div>)}
  </div>}
 </section>;
}
