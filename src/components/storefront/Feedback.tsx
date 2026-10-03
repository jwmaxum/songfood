'use client';
import {Children,useEffect,useRef,type ReactNode} from 'react';
import {useLanguage} from '@/lib/i18n/LanguageContext';
export default function Feedback({children,error=false,className=''}:{children:ReactNode;error?:boolean;className?:string}){
 const ref=useRef<HTMLDivElement>(null),{t}=useLanguage();
 useEffect(()=>{if(error&&children)ref.current?.focus();},[error,children]);
 if(!children)return null;
 return <div ref={ref} role={error?'alert':'status'} tabIndex={error?-1:undefined} className={className}>{Children.map(children,child=>typeof child==='string'?t(child):child)}</div>;
}
