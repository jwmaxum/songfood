import type {CatalogueEntry} from '../pricing/types';
export type ReleaseAvailability={enabled:boolean;products:Record<string,{domestic:boolean;export:boolean}>};
export function restrictCatalogue(entries:CatalogueEntry[],availability:ReleaseAvailability){
 if(!availability||typeof availability.enabled!=='boolean'||!availability.products||Array.isArray(availability.products))throw new Error('Release status unavailable');
 if(!availability.enabled)return entries;
 return entries.map(entry=>availability.products[entry.product_id]?.domestic===true?entry:{...entry,units:{},message:'출시 검수 중입니다. 구매 문의를 남겨 주세요. / Release review pending. Please submit an inquiry.'});
}
