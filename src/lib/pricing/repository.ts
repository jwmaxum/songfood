import 'server-only';
import {reportOperationalFailure} from '../operational-error';
import { supabaseAdmin } from '../supabase-admin';
import { ApiError, json } from '../request-security';
import { PricingError, unitsPerPackage } from './validation';
import { calculateLine, summarize } from './engine';
import type { CatalogueEntry, ExchangeRate, PriceList, PriceRequest, PriceRevision, TradeUnit } from './types';
import type { CustomerSession } from '../b2b-types';
export function pricingFailure(error:unknown) {
  reportOperationalFailure('pricing',error instanceof PricingError || error instanceof ApiError?error.status:503);
  if(error instanceof PricingError || error instanceof ApiError) return json({success:false,error:error.message,code:error instanceof PricingError?error.code:undefined},error.status);
  return json({success:false,error:'가격 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'},503);
}
export async function loadPricingData() {
  const [lists,rates]=await Promise.all([
    supabaseAdmin.from('b2b_price_lists').select('*').eq('active',true),
    supabaseAdmin.from('b2b_exchange_rates').select('*').order('created_at',{ascending:false}).limit(1),
  ]);
  if(lists.error || rates.error) throw new ApiError(503,'가격표·환율 정보를 불러오지 못했습니다.');
  const revisions:PriceRevision[]=[];
  for(let start=0;;start+=500) {
    const result=await supabaseAdmin.from('b2b_price_revisions').select('*').order('version',{ascending:false}).order('id').range(start,start+499);
    if(result.error)throw new ApiError(503,'가격 버전을 불러오지 못했습니다.');
    revisions.push(...result.data.map(row=>({...row,unit_price_krw:row.unit_price_krw===null?null:String(row.unit_price_krw)})) as PriceRevision[]);
    if(result.data.length<500)break;
  }
  return {lists:lists.data as PriceList[],rate:rates.data[0] as ExchangeRate||null,revisions};
}
export function selectPrice(productId:string,session:CustomerSession,lists:PriceList[],revisions:PriceRevision[],now=new Date()) {
  const company=session.company?.status==='approved' && session.membership?.status==='active'?session.company:null;
  const eligible=lists.filter(l=>l.active && (l.scope==='common' || (l.scope==='company' && l.company_id===company?.id) || l.scope===(company?'business':'personal')));
  const rank=(l:PriceList)=>l.scope==='company'?3:l.scope==='common'?1:2;
  eligible.sort((a,b)=>rank(b)-rank(a));
  for(const list of eligible) {
    // A future version starts on its effective date. An expired latest version never revives an older price.
    const row=revisions.filter(p=>p.product_id===productId && p.price_list_id===list.id && p.status==='approved'
      && p.valid_from && Date.parse(p.valid_from)<=now.getTime()).sort((a,b)=>b.version-a.version)[0];
    if(row)return row;
  }
  throw new PricingError('PRICE_UNAPPROVED','검수된 가격이 없습니다. 구매 문의를 남겨 주세요.');
}
export async function quote(session:CustomerSession,items:PriceRequest[],market:'domestic'|'export') {
  const data=await loadPricingData(),now=new Date();
  return summarize(items.map(item=>calculateLine(selectPrice(item.product_id,session,data.lists,data.revisions,now),item,market,data.rate,now)),market);
}
export async function catalogue(session:CustomerSession):Promise<CatalogueEntry[]> {
  const data=await loadPricingData(),ids=[...new Set(data.revisions.map(p=>p.product_id))],now=new Date();
  return ids.map(product_id=>{
    const entry:CatalogueEntry={product_id,units:{},message:''};
    try {
      const p=selectPrice(product_id,session,data.lists,data.revisions,now);
      if(p.minimum_order_unit && p.minimum_order_quantity)entry.minimum_order={unit:p.minimum_order_unit,quantity:p.minimum_order_quantity};
      if(p.export_moq_ctn)entry.export_moq_ctn=p.export_moq_ctn;
      if(p.loading_port)entry.loading_port=p.loading_port;
      for(const unit of ['EA','BOX','CTN'] as TradeUnit[]) {
        try {
          const qty=Math.ceil(unitsPerPackage(p,p.minimum_order_unit!)*p.minimum_order_quantity!/unitsPerPackage(p,unit));
          entry.units[unit]={quantity:qty,line:calculateLine(p,{product_id,unit,quantity:qty},'domestic',null,now)};
        } catch(error) {if(error instanceof PricingError) entry.message=error.message;else throw error;}
      }
      if(Object.keys(entry.units).length)entry.message='';
    } catch(error) {entry.message=error instanceof PricingError?error.message:'가격 확인이 필요합니다.';}
    return entry;
  });
}
export async function publicMinimums():Promise<Record<string,{unit:TradeUnit;quantity:number}>> {
  const {data:lists,error}=await supabaseAdmin.from('b2b_price_lists').select('id').eq('scope','common').eq('active',true);
  if(error)throw new ApiError(503,'최소 구매단위 정보를 불러오지 못했습니다.');
  if(!lists.length)return {};
  const data:{product_id:string;version:number;minimum_order_unit:TradeUnit|null;minimum_order_quantity:number|null}[]=[];
  const now=new Date().toISOString();
  for(let start=0;;start+=500) {
    const rows=await supabaseAdmin.from('b2b_price_revisions').select('id,product_id,version,minimum_order_unit,minimum_order_quantity')
      .eq('price_list_id',lists[0].id).eq('status','approved').lte('valid_from',now).order('version',{ascending:false}).order('id').range(start,start+499);
    if(rows.error)throw new ApiError(503,'최소 구매단위 정보를 불러오지 못했습니다.');
    data.push(...rows.data);if(rows.data.length<500)break;
  }
  const result:Record<string,{unit:TradeUnit;quantity:number}>={};
  for(const r of data)if(!result[r.product_id] && r.minimum_order_unit && r.minimum_order_quantity)result[r.product_id]={unit:r.minimum_order_unit,quantity:r.minimum_order_quantity};
  return result;
}
