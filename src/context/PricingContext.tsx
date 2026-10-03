'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import type { CatalogueEntry, Preview, PriceRequest } from '@/lib/pricing/types';
const PricingContext=createContext<{products:Record<string,CatalogueEntry>;error:string;loading:boolean;revision:number}>({products:{},error:'',loading:false,revision:0});
function useIdentityKey() {
  const {user,company,membership}=useAuth();
  return user?[user.id,company?.id,company?.status,membership?.status].join(':'):'';
}
export function PricingProvider({children}:{children:React.ReactNode}) {
  const key=useIdentityKey();
  const [state,setState]=useState<{key:string;products:Record<string,CatalogueEntry>;error:string;revision:number}>({key:'',products:{},error:'',revision:0});
  useEffect(()=>{
    if(!key)return;
    const controller=new AbortController();
    async function refresh() {
      try {
        const r=await fetch('/api/pricing/catalogue',{cache:'no-store',signal:controller.signal}),body=await r.json();
        if(!r.ok)throw new Error(body.error);
        setState({key,products:Object.fromEntries((body.products as CatalogueEntry[]).map(p=>[p.product_id,p])),error:'',revision:Date.now()});
      } catch(e) {if(!controller.signal.aborted)setState({key,products:{},error:e instanceof Error?e.message:'가격을 불러오지 못했습니다.',revision:Date.now()});}
    }
    void refresh();const timer=setInterval(()=>void refresh(),60000);window.addEventListener('focus',refresh);
    return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);};
  },[key]);
  return <PricingContext.Provider value={key && state.key===key?{products:state.products,error:state.error,loading:false,revision:state.revision}:{products:{},error:'',loading:!!key,revision:0}}>{children}</PricingContext.Provider>;
}
export function usePricing(){return useContext(PricingContext);}
export function usePricePreview(items:PriceRequest[],market:'domestic'|'export'='domestic') {
  const identity=useIdentityKey(),{revision}=usePricing(),serialized=JSON.stringify(items);
  const key=identity+'|'+market+'|'+serialized+'|'+revision;
  const [state,setState]=useState<{key:string;preview:Preview|null;error:string}>({key:'',preview:null,error:''});
  useEffect(()=>{
    if(!identity || serialized==='[]')return;
    const c=new AbortController();
    const timer=setTimeout(()=>{
      fetch('/api/pricing/preview',{method:'POST',headers:{'Content-Type':'application/json'},signal:c.signal,body:JSON.stringify({market,items:JSON.parse(serialized)})})
        .then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error);setState({key,preview:b.preview,error:''});})
        .catch(e=>{if(!c.signal.aborted)setState({key,preview:null,error:e.message || '가격 확인 실패'});});
    },200);
    return()=>{clearTimeout(timer);c.abort();};
  },[identity,key,market,serialized]);
  if(!identity)return {preview:null,error:'로그인 후 가격을 확인할 수 있습니다.',loading:false};
  if(serialized==='[]')return {preview:null,error:'',loading:false};
  return state.key===key?{preview:state.preview,error:state.error,loading:false}:{preview:null,error:'',loading:true};
}
