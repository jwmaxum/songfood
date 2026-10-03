import type {PriceList,PriceRevision,ExchangeRate} from '../pricing/types';
import {readiness} from '../pricing/validation';
import type {OpsRow} from './types';
export type QualityInput={as_of:string;products:{id:string;sku:string;name:string;origin:string|null;storage:string|null;shelf_life:string|null}[];lists:PriceList[];revisions:PriceRevision[];rate:ExchangeRate|null};
export function qualitySnapshot(data:QualityInput,q:string,category:string,page:number){
 const now=Date.parse(data.as_of),rows:OpsRow[]=[];
 for(const product of data.products){
 const lists=data.lists.filter(l=>l.scope==='common'||data.revisions.some(r=>r.product_id===product.id&&r.price_list_id===l.id));
 if(!lists.length)lists.push({id:'',name:'기본 가격표 미등록',scope:'common',company_id:null,active:true});
 for(const list of lists){
 const versions=data.revisions.filter(r=>r.product_id===product.id&&r.price_list_id===list.id).sort((a,b)=>b.version-a.version);
 const current=versions.find(r=>r.status==='approved'&&r.valid_from&&Date.parse(r.valid_from)<=now),latest=versions[0],issues:string[]=[],tags:string[]=[];
 if(!current){tags.push('missing');issues.push('현재 적용할 승인 가격 없음');}
 for(const [field,label]of [['sku','SKU'],['origin','원산지'],['storage','보관방법'],['shelf_life','소비기한']] as const)if(!product[field]?.trim())issues.push(label+' 미입력');
 if(current){
 issues.push(...readiness(current,'export'));
 const until=Date.parse(current.valid_until||'');
 if(!Number.isFinite(until)||until<=now){tags.push('expired');issues.push('최신 적용 가격 만료');}
 else if(until<now+7*86400000)tags.push('soon');
 }
 if(issues.some(i=>!['현재 적용할 승인 가격 없음','최신 적용 가격 만료'].includes(i)))tags.push('data');
 if(latest?.status==='draft')tags.push('draft');
 if(tags.length)rows.push({id:product.id+':'+list.id,title:product.name,subtitle:list.name,sku:product.sku,price_list_id:list.id,list_name:list.name,tags,issues,valid_until:current?.valid_until||undefined});
 }}
 const eligible=rows.filter(r=>(r.title+' '+r.sku+' '+r.subtitle).toLowerCase().includes(q.toLowerCase()));
 const counts:Record<string,number>={};for(const r of eligible)for(const t of r.tags||[])counts[t]=(counts[t]||0)+1;
 const filtered=eligible.filter(r=>!category||r.tags?.includes(category));
 const rate=data.rate,rate_alert=!rate?'승인된 환율 없음':Date.parse(rate.valid_until)<=now||Date.parse(rate.observed_at)>now?'최신 승인 환율의 적용기간 확인 필요':Date.parse(rate.valid_until)<now+86400000?'승인 환율 24시간 이내 만료':'';
 return {items:filtered.slice((page-1)*30,page*30),total:filtered.length,counts,rate_alert,as_of:data.as_of,page,page_size:30};
}
