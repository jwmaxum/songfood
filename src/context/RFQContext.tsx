'use client';
import {createContext,useCallback,useContext,useEffect,useState} from 'react';
import {useAuth} from './AuthContext';
import {parseRfqLines,RFQ_STORAGE_KEY,validQuantity,type RfqLine} from '@/lib/storefront';
export type BuyerDraft={company:string;contact_name:string;email:string;phone:string;business_type:string;country:string;destination_port:string;incoterms:string;notes:string;requested_loading_port?:string;desired_ship_date?:string;required_documents?:string};
type State={buyerDraft:BuyerDraft;setBuyerDraft:(value:BuyerDraft)=>void;ready:boolean;items:RfqLine[];notice:string;add:(id:string,quantity:number)=>boolean;setQuantity:(id:string,quantity:number)=>void;remove:(id:string)=>void;clear:()=>void;mergeMissing:(items:RfqLine[])=>void};
const RFQContext=createContext<State|null>(null);
export function RFQProvider({children}:{children:React.ReactNode}) {
  const {user}=useAuth(),identity=user?.id||'guest';
  const empty:BuyerDraft={company:'',contact_name:'',email:'',phone:'',business_type:'',country:'',destination_port:'',incoterms:'FOB',notes:''};
  const [buyerState,setBuyerState]=useState<{key:string;value:BuyerDraft}>({key:'guest',value:empty});
  const buyerDraft=buyerState.key===identity?buyerState.value:empty;
  const setBuyerDraft=(value:BuyerDraft)=>setBuyerState({key:identity,value});
  const [items,setItems]=useState<RfqLine[]>([]),[ready,setReady]=useState(false),[notice,setNotice]=useState('');
  useEffect(()=>{
    let active=true;
    Promise.resolve().then(()=>{
      if(!active)return;
      try {setItems(parseRfqLines(JSON.parse(localStorage.getItem(RFQ_STORAGE_KEY)||'[]')));}
      catch {setNotice('견적함 저장 내용을 읽지 못했습니다. 상품을 다시 선택해 주세요.');}
      setReady(true);
    });
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(!ready)return;
    try {localStorage.setItem(RFQ_STORAGE_KEY,JSON.stringify(items));}
    catch { /* Selection remains usable in memory when browser storage is unavailable. */ }
  },[items,ready]);
  const mergeMissing=useCallback((rows:RfqLine[])=>{
    setItems(current=>parseRfqLines([...current,...rows]));
  },[]);
  function add(id:string,quantity:number) {
    if(!ready||!id||id.length>100||!validQuantity(quantity))return false;
    if((items.find(i=>i.product_id===id)?.quantity||0)+quantity>100000){setNotice('품목당 최대 100,000 CTN입니다. 견적함에서 수량을 확인해 주세요.');return false;}
    if(!items.some(i=>i.product_id===id)&&items.length>=100){setNotice('견적함에는 최대 100개 상품을 담을 수 있습니다.');return false;}
    setItems(current=>current.some(i=>i.product_id===id)?current.map(i=>i.product_id===id?{...i,quantity:Math.min(100000,i.quantity+quantity)}:i):[...current,{product_id:id,quantity}]);
    setNotice('해외 견적함에 담았습니다. / Added to RFQ.');return true;
  }
  function setQuantity(id:string,quantity:number){if(validQuantity(quantity))setItems(current=>current.map(i=>i.product_id===id?{...i,quantity}:i));}
  return <RFQContext.Provider value={{buyerDraft,setBuyerDraft,items,ready,notice,add,setQuantity,mergeMissing,remove:id=>setItems(current=>current.filter(i=>i.product_id!==id)),clear:()=>setItems([])}}>{children}</RFQContext.Provider>;
}
export function useRFQ(){const value=useContext(RFQContext);if(!value)throw new Error('RFQProvider is required');return value;}
