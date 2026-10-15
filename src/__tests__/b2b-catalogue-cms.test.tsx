/** @jest-environment jsdom */
import {render,screen,fireEvent,within} from '@testing-library/react';
import '@testing-library/jest-dom';
import CmsLinks,{publicCmsLinks} from '@/components/layout/CmsLinks';
import CategoryNavigation from '@/components/storefront/CategoryNavigation';
import {LanguageProvider} from '@/lib/i18n/LanguageContext';
import {catalogueHref} from '@/lib/catalogue-navigation';
import type {MenuItem} from '@/lib/types';
jest.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams('lang=ko')}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}));
const collection='K-만두/냉동식품',category='만두 & 교자';
const destination=catalogueHref('',{collection,category,lang:'ko'});
const menu=(id:string,url:string,title=id):MenuItem=>({id,title,url,is_active:true,parent_id:null,sort_order:1,position:'both'});

test('new admin canonical destinations survive while legacy, unknown taxonomy and unsafe links stay hidden',()=>{
 const rows=[
  menu('new-menu',destination),menu('old-menu','/collections?cat=fresh'),menu('old-shop','/shop?cat=unknown'),
  menu('deleted','/shop?collection=deleted'),menu('mismatch',catalogueHref('',{collection,category:'라면'})),
  menu('unknown-key','/shop?next=https%3A%2F%2Fevil.invalid'),menu('external','https://evil.invalid/shop'),
  menu('network','//evil.invalid/shop'),menu('encoded-control','/shop?q=%5c%5cevil'),
  {...menu('inactive',destination),is_active:false},
 ];
 expect(publicCmsLinks(rows,'catalogue').map(item=>item.id)).toEqual(['new-menu']);
});
test('company section excludes product menus while default all restores canonical footer menus',()=>{
 const rows=[menu('contact','/contact','회사 문의'),menu('product',destination,'신규 상품 메뉴')];
 const rendered=render(<CmsLinks menus={rows} section="company"/>);
 expect(screen.getByRole('link',{name:'회사 문의'})).toHaveAttribute('href','/contact?lang=ko');
 expect(screen.queryByRole('link',{name:'신규 상품 메뉴'})).not.toBeInTheDocument();
 rendered.rerender(<CmsLinks menus={rows}/>);
 expect(screen.getByRole('link',{name:'신규 상품 메뉴'})).toHaveAttribute('href',destination);
});
test('static category duplicates ignore locale and first page while search, brand and channel shortcuts stay distinct',()=>{
 const staticHref=catalogueHref('',{collection,category,page:'1',lang:'en'});
 const rows=[
  menu('static',destination),menu('query',catalogueHref('',{collection,category,q:'mandu'})),
  menu('brand',catalogueHref('',{collection,category,brand:'songfood'})),
  menu('export',catalogueHref('',{collection,category,mode:'export'})),
 ];
 expect(publicCmsLinks(rows,'catalogue',[staticHref]).map(item=>item.id)).toEqual(['query','brand','export']);
 const parent=menu('contact','/contact');parent.children=[menu('child',destination)];
 expect(publicCmsLinks([parent,menu('duplicate',destination)],'catalogue').map(item=>item.id)).toEqual(['child']);
});
test('header category panel places custom product shortcuts with categories and closes after navigation',()=>{
 const rows=[menu('static',destination,'중복 관리자 분류'),menu('search',catalogueHref('',{q:'mandu'}),'만두 빠른 검색')];
 render(<CategoryNavigation compact menus={rows}/>);
 const trigger=screen.getByRole('button',{name:/카테고리/});
 fireEvent.click(trigger);
 const panel=within(screen.getByRole('navigation',{name:'상품 카테고리'}));
 expect(panel.queryByRole('link',{name:'중복 관리자 분류'})).not.toBeInTheDocument();
 fireEvent.click(panel.getByRole('link',{name:'만두 빠른 검색'}));
 expect(trigger).toHaveAttribute('aria-expanded','false');
});
test('custom CMS titles retain the existing Korean-only policy and static categories remain bilingual',()=>{
 render(<LanguageProvider initialLanguage="en"><CategoryNavigation menus={[menu('query','/shop?q=mandu','관리자 입력 제목')]}/></LanguageProvider>);
 expect(screen.queryByText('관리자 입력 제목')).not.toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Dumplings & Frozen Foods'})).toBeInTheDocument();
});

test('reviewed product detail menus are restored in product navigation and footer, preserving safe query context',()=>{
 const direct=menu('detail','/products/qa-product','개별 상품 보기');
 const context='/shop?q=mandu&mode=export&lang=en&page=2';
 const scoped=menu('scoped','/products/qa-other?'+new URLSearchParams({mode:'export',lang:'ko',returnTo:context}).toString());
 expect(publicCmsLinks([direct,scoped],'catalogue').map(item=>item.id)).toEqual(['detail','scoped']);
 expect(publicCmsLinks([direct,scoped],'company')).toEqual([]);
 const selected=publicCmsLinks([scoped])[0],query=new URL(selected.url,'https://songfood.invalid').searchParams;
 expect(query.get('mode')).toBe('export');expect(query.get('lang')).toBe('ko');expect(query.get('returnTo')).toBe(context);
 render(<CmsLinks menus={[direct]}/>);
 expect(screen.getByRole('link',{name:'개별 상품 보기'})).toHaveAttribute('href','/products/qa-product?lang=ko');
});
test('product detail menus reject unsafe paths, unsupported parameters and external result destinations',()=>{
 const rows=[
  '/products','/products/qa/extra','/products/qa%2Fextra','/products/%5Cevil','/products/../admin',
  '/products/qa?mode=invalid','/products/qa?lang=zz','/products/qa?next=https%3A%2F%2Fevil.invalid',
  '/products/qa?mode=export&mode=domestic','/products/qa?returnTo='+encodeURIComponent('//evil.invalid/shop'),
  '/products/qa?returnTo='+encodeURIComponent('/admin/users'),
 ].map((url,index)=>menu('bad-'+index,url));
 expect(publicCmsLinks(rows)).toEqual([]);
 expect(publicCmsLinks([menu('domestic','/products/qa?mode=domestic&lang=en')],'catalogue')[0].url).toBe('/products/qa?mode=domestic&lang=en');
});
