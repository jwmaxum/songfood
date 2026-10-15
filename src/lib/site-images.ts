import {PRODUCT_COLLECTIONS} from './product-taxonomy';
import {storedMediaImageAddress} from './media-image-url';
const collectionKeys:Record<string,string>={
 'K-김치/발효식품':'kimchi','K-만두/냉동식품':'dumplings','K-간편식/HMR':'hmr','K-면류/라면':'noodles','K-소스/장류':'sauces','K-김/수산가공':'seafood','K-스낵/전통과자':'snacks','K-주류/전통주':'alcohol','K-음료/전통차':'drinks',
};
export const SITE_IMAGE_FIELDS=[{key:'branding_logo',label:'공통 로고',collection:''},...PRODUCT_COLLECTIONS.map(collection=>({key:'collection_'+collectionKeys[collection],label:collection,collection}))];
export type SiteImages={logo:string;collections:Record<string,string>};
export const emptySiteImages:SiteImages={logo:'',collections:{}};
/** Public projection: only the reviewed keys and this project's public uploaded images. */
export function projectSiteImages(rows:{section_key?:string;media_url?:unknown}[],supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL):SiteImages{
 const result:SiteImages={logo:'',collections:{}};
 for(const field of SITE_IMAGE_FIELDS){const row=rows.find(item=>item.section_key===field.key);const url=storedMediaImageAddress(row?.media_url,supabaseUrl);if(!url)continue;
  if(field.collection)result.collections[field.collection]=url;else result.logo=url;
 }
 return result;
}
