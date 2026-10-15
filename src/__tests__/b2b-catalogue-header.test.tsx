/** @jest-environment jsdom */
import {render,screen,within} from '@testing-library/react';
import '@testing-library/jest-dom';
import HeaderClient from '@/components/layout/HeaderClient';
import {LanguageProvider} from '@/lib/i18n/LanguageContext';
let mockPath='/shop';
let mockQuery='mode=export&lang=en&market=USA&q=mandu';
jest.mock('next/navigation',()=>({usePathname:()=>mockPath,useSearchParams:()=>new URLSearchParams(mockQuery)}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}));
jest.mock('next/image',()=>({__esModule:true,default:()=>null}));
jest.mock('@/context/CartContext',()=>({useCart:()=>({cartItems:[]})}));
jest.mock('@/context/RFQContext',()=>({useRFQ:()=>({items:[]})}));
jest.mock('@/context/AuthContext',()=>({useAuth:()=>({user:null})}));
jest.mock('@/components/storefront/CategoryNavigation',()=>({__esModule:true,default:()=>null}));
jest.mock('@/components/storefront/CatalogueSearch',()=>({__esModule:true,default:()=>null}));

function mainLinks() {
 render(<LanguageProvider initialLanguage="en"><HeaderClient menus={[]}/></LanguageProvider>);
 return within(screen.getByRole('navigation',{name:'Main navigation'}));
}
test('header channel switch clears export-only market and retains common search and English',()=>{
 mockPath='/shop';mockQuery='mode=export&lang=en&market=USA&q=mandu';
 const links=mainLinks(),domestic=links.getByRole('link',{name:'Domestic'}),overseas=links.getByRole('link',{name:'Export catalogue'});
 const query=new URL(domestic.getAttribute('href')!,'https://songfood.invalid').searchParams;
 expect(query.has('market')).toBe(false);expect(query.has('mode')).toBe(false);
 expect(query.get('q')).toBe('mandu');expect(query.get('lang')).toBe('en');
 expect(overseas).toHaveAttribute('aria-current','page');expect(domestic).not.toHaveAttribute('aria-current');
});
test('header uses the individual detail return context for channel navigation and keeps home as home',()=>{
 mockPath='/products/qa-1';
 const result='/shop?'+new URLSearchParams({q:'mandu',collection:'K-만두/냉동식품',market:'USA',mode:'export',lang:'en',page:'2'}).toString();
 mockQuery=new URLSearchParams({mode:'export',lang:'en',returnTo:result}).toString();
 const links=mainLinks(),domestic=new URL(links.getByRole('link',{name:'Domestic'}).getAttribute('href')!,'https://songfood.invalid');
 expect(domestic.searchParams.get('q')).toBe('mandu');expect(domestic.searchParams.get('collection')).toBe('K-만두/냉동식품');
 expect(domestic.searchParams.get('page')).toBe('1');expect(domestic.searchParams.has('market')).toBe(false);
 const home=new URL(screen.getByRole('link',{name:/SONGFOOD/}).getAttribute('href')!,'https://songfood.invalid');
 expect(home.pathname).toBe('/');expect(home.searchParams.get('mode')).toBe('export');
 expect(home.searchParams.has('q')).toBe(false);
});

test.each([
 {mode:undefined,returnTo:'/shop?q=mandu&mode=export&lang=en',expected:'export',query:'mandu'},
 {mode:'domestic',returnTo:'/shop?q=mandu&mode=export&lang=en',expected:null,query:'mandu'},
 {mode:undefined,returnTo:'https://evil.invalid/shop?q=evil&mode=export',expected:null,query:null},
])('detail header inherits only a safe channel and respects explicit domestic: $mode / $expected',({mode,returnTo,expected,query})=>{
 mockPath='/products/qa-1';
 const params=new URLSearchParams({returnTo,lang:'en'});if(mode)params.set('mode',mode);mockQuery=params.toString();
 const links=mainLinks(),home=new URL(screen.getByRole('link',{name:/SONGFOOD/}).getAttribute('href')!,'https://songfood.invalid');
 expect(home.searchParams.get('mode')).toBe(expected);
 const domestic=new URL(links.getByRole('link',{name:'Domestic'}).getAttribute('href')!,'https://songfood.invalid');
 expect(domestic.searchParams.get('q')).toBe(query);expect(domestic.searchParams.has('market')).toBe(false);
});
