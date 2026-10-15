/** @jest-environment jsdom */
import {render,screen,within} from '@testing-library/react';
import '@testing-library/jest-dom';
import CollectionShowcaseClient from '@/app/collections/CollectionShowcaseClient';
import type {ProductItem} from '@/lib/types';
let mockParams=new URLSearchParams('minimum=CTN&lang=en');
let mockLanguage:'ko'|'en'='en';
jest.mock('next/navigation',()=>({useSearchParams:()=>mockParams,usePathname:()=>'/shop'}));
jest.mock('@/components/layout/LocalizedLink',()=>({__esModule:true,default:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}));
jest.mock('@/lib/i18n/LanguageContext',()=>({useLanguage:()=>({language:mockLanguage,t:(value:string)=>value,text:(ko:string,en:string)=>mockLanguage==='en'?en:ko})}));
jest.mock('@/context/PricingContext',()=>({usePricing:()=>({products:{'qa-moq':{minimum_order:{unit:'BOX',quantity:1},units:{BOX:{quantity:1}},export_moq_ctn:2}}})}));
jest.mock('@/context/CartContext',()=>({useCart:()=>({addToCart:jest.fn()})}));
jest.mock('@/context/RFQContext',()=>({useRFQ:()=>({ready:true,add:jest.fn()})}));
jest.mock('@/components/pricing/ProductPrice',()=>({ProductPrice:()=>null}));
jest.mock('@/components/storefront/TradeLinks',()=>({__esModule:true,default:()=>null}));
jest.mock('@/components/storefront/CategoryNavigation',()=>({__esModule:true,default:()=>null}));
const product={id:'qa-moq',sku:'QA-MOQ',name:'공개 카톤 상품',name_en:'Public carton item',brand:'QA ONLY',collection:'K-만두/냉동식품',category:'만두 & 교자',format:'1 kg',storage:'Frozen',image_url:'/logo.png',purchase_minimum:{unit:'CTN',quantity:2}} as ProductItem;

test('catalogue filters keep public MOQ even when account purchase MOQ differs',()=>{
 const {rerender}=render(<CollectionShowcaseClient initialProducts={[product]}/>);
 expect(screen.getByRole('article')).toHaveTextContent('Public carton item');
 // Purchase controls may use the signed-in account BOX offer without changing result membership.
 expect(screen.getByRole('combobox',{name:'QA-MOQ 구매 단위'})).toHaveValue('BOX');
 mockParams=new URLSearchParams('minimum=BOX&lang=en');
 rerender(<CollectionShowcaseClient initialProducts={[product]}/>);
 expect(screen.queryByRole('article')).not.toBeInTheDocument();
 mockParams=new URLSearchParams('minimum=CTN&maxMinimum=1&lang=en');
 rerender(<CollectionShowcaseClient initialProducts={[product]}/>);
 expect(screen.queryByRole('article')).not.toBeInTheDocument();
 mockParams=new URLSearchParams('minimum=CTN&maxMinimum=2&lang=en');
 rerender(<CollectionShowcaseClient initialProducts={[product]}/>);
 expect(screen.getByRole('article')).toHaveTextContent('Public carton item');
});

for(const language of ['ko','en'] as const)test('brand options follow selected '+language+' regardless of host locale',()=>{
 mockLanguage=language;mockParams=new URLSearchParams('lang='+language);
 const original=String.prototype.localeCompare;let hostLanguage='en';
 const compare=jest.spyOn(String.prototype,'localeCompare').mockImplementation(function(this:string,other:string,locales?:Intl.LocalesArgument,options?:Intl.CollatorOptions){return original.call(this,other,locales??hostLanguage,options);});
 try{
  const products=[{...product,id:'brand-songfood',brand:'송영민푸드'},{...product,id:'brand-bibigo',brand:'bibigo'}];
  const {rerender}=render(<CollectionShowcaseClient initialProducts={products}/>);
  const options=()=>within(screen.getByRole('combobox',{name:'브랜드'})).getAllByRole('option').map(option=>option.textContent);
  const expected=language==='ko'?['전체','송영민푸드','bibigo']:['전체','bibigo','Songfood'];
  expect(options()).toEqual(expected);
  hostLanguage='ko';rerender(<CollectionShowcaseClient initialProducts={products}/>);
  expect(options()).toEqual(expected);
 }finally{compare.mockRestore();}
});
