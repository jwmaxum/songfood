import {PRODUCT_TAXONOMY} from './product-taxonomy';

type Locale='ko'|'en';
const collectionLabels:Record<string,readonly [string,string]>={
 'K-김치/발효식품':['김치·발효식품','Kimchi & Fermented Foods'],
 'K-만두/냉동식품':['만두·냉동식품','Dumplings & Frozen Foods'],
 'K-간편식/HMR':['간편식·국·밀키트','Ready Meals & Meal Kits'],
 'K-면류/라면':['면류·라면','Noodles & Ramyeon'],
 'K-소스/장류':['소스·장류·조미료','Sauces & Seasonings'],
 'K-김/수산가공':['김·수산가공·건어물','Seaweed & Seafood'],
 'K-스낵/전통과자':['스낵·전통과자','Snacks & Traditional Sweets'],
 'K-주류/전통주':['주류·전통주','Korean Alcoholic Beverages'],
 'K-음료/전통차':['음료·전통차','Drinks & Traditional Teas'],
};
const categoryLabels:Record<string,string>={
 '김치 & 발효식품':'Kimchi & Fermented Foods',
 '만두 & 교자':'Dumplings & Gyoza',
 '떡볶이 & 밀키트':'Tteokbokki & Meal Kits',
 '국 & 탕류':'Soups & Stews',
 '간편식 & 조리육류':'Ready Meals & Prepared Meats',
 '라면':'Ramyeon','생면 & 국수':'Fresh Noodles','당면':'Glass Noodles',
 '장류':'Fermented Pastes','소스 & 양념':'Sauces & Marinades','분말 조미료':'Powdered Seasonings',
 '김 가공품':'Seasoned Seaweed','해조류':'Sea Vegetables','어묵 & 수산가공':'Fish Cakes & Processed Seafood','건어물 & 안주류':'Dried Seafood & Savoury Snacks',
 '스낵 & 과자':'Snacks & Biscuits','전통과자':'Traditional Sweets',
 '증류식 소주':'Distilled Soju','막걸리 & 탁주':'Makgeolli & Rice Wine',
 '전통 음료':'Traditional Drinks','전통차':'Traditional Teas',
};
export const CATALOGUE_TAXONOMY=PRODUCT_TAXONOMY;
export function collectionLabel(value:string|null|undefined,locale:Locale):string {
 if(!value?.trim())return locale==='en'?'Unclassified':'미분류';
 return collectionLabels[value]?.[locale==='en'?1:0]??value;
}
export function categoryLabel(value:string|null|undefined,locale:Locale):string {
 if(!value?.trim())return locale==='en'?'Unclassified':'미분류';
 return locale==='en'?(categoryLabels[value]??value):value;
}
export function productName(product:{name?:string|null;name_en?:string|null},locale:Locale):string {
 const ko=product.name?.trim(),en=product.name_en?.trim();
 return (locale==='en'?(en||ko):(ko||en))||(locale==='en'?'Unnamed product':'상품명 미입력');
}
export function brandKey(value:string):string {
 const key=value.normalize('NFC').trim().toLocaleLowerCase().replace(/\s+/g,' ');
 return ['송영민푸드','송영민푸드 (songfood)','songfood'].includes(key)?'songfood':key;
}
export function brandLabel(value:string,locale:Locale):string {
 return brandKey(value)==='songfood'?(locale==='en'?'Songfood':'송영민푸드'):value.trim();
}
