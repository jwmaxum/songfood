/** @jest-environment jsdom */
import {render,screen,fireEvent,within,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import NavigationManager from '@/app/admin/navigation/NavigationManager';
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}));
const original=global.fetch;
afterEach(()=>{global.fetch=original;});
function mockMenus(){
 const fetcher=jest.fn(async(_url:string,options?:RequestInit)=>({ok:true,json:async()=>options?.method==='POST'?{data:{id:'qa-menu',...JSON.parse(String(options.body))}}:{success:true,data:[]}}));
 global.fetch=fetcher as unknown as typeof fetch;return fetcher;
}
test('administrator creates a taxonomy destination with bilingual previews and current channel',async()=>{
 const fetcher=mockMenus();render(<NavigationManager/>);
 await screen.findByText('No menus found in this view.');
 fireEvent.click(screen.getByRole('button',{name:'ADD DEPTH 1 MENU'}));
 const dialog=screen.getByRole('dialog');const form=within(dialog);
 expect(form.getByLabelText('Title / Label')).toHaveFocus();
 fireEvent.change(form.getByLabelText('Title / Label'),{target:{value:'만두 안내'}});
 fireEvent.change(form.getByLabelText('상품 대분류'),{target:{value:'K-만두/냉동식품'}});
 fireEvent.change(form.getByLabelText('제품종류'),{target:{value:'만두 & 교자'}});
 fireEvent.change(form.getByLabelText('구매 유형'),{target:{value:'export'}});
 const ko=new URL(form.getByRole('link',{name:'한국어 결과 미리보기 (새 탭)'}).getAttribute('href')!,'https://qa.invalid');
 const en=new URL(form.getByRole('link',{name:'English results preview (new tab)'}).getAttribute('href')!,'https://qa.invalid');
 expect(ko.pathname).toBe('/shop');expect(ko.searchParams.get('collection')).toBe('K-만두/냉동식품');expect(ko.searchParams.get('category')).toBe('만두 & 교자');expect(ko.searchParams.get('mode')).toBe('export');expect(ko.searchParams.get('lang')).toBe('ko');expect(ko.searchParams.has('cat')).toBe(false);expect(en.searchParams.get('lang')).toBe('en');
 expect(form.getByText('English: Dumplings & Gyoza')).toBeInTheDocument();
 fireEvent.change(form.getByLabelText('상품 대분류'),{target:{value:'K-소스/장류'}});
 expect(form.getByLabelText('제품종류')).toHaveValue('');
 fireEvent.click(form.getByRole('button',{name:'Create Menu'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 const posted=fetcher.mock.calls.find(call=>call[1]?.method==='POST')!;
 const data=JSON.parse(String(posted[1]!.body));const saved=new URL(data.url,'https://qa.invalid');
 expect(data.title).toBe('만두 안내');expect(saved.searchParams.get('collection')).toBe('K-소스/장류');expect(saved.searchParams.has('category')).toBe(false);expect(saved.searchParams.get('mode')).toBe('export');expect(saved.searchParams.get('lang')).toBe('ko');
});
test('custom links reject external paths and closing restores the menu button focus',async()=>{
 const fetcher=mockMenus();render(<NavigationManager/>);await screen.findByText('No menus found in this view.');
 const opener=screen.getByRole('button',{name:'ADD DEPTH 1 MENU'});opener.focus();fireEvent.click(opener);
 const dialog=screen.getByRole('dialog');const form=within(dialog);
 fireEvent.change(form.getByLabelText('Title / Label'),{target:{value:'unsafe'}});
 fireEvent.change(form.getByLabelText('메뉴 목적지'),{target:{value:'custom'}});
 fireEvent.change(form.getByLabelText('URL / Route Path'),{target:{value:'//external.example'}});
 fireEvent.click(form.getByRole('button',{name:'Create Menu'}));
 expect(fetcher.mock.calls.some(call=>call[1]?.method==='POST')).toBe(false);expect(screen.getByText('메뉴에는 안전한 내부 페이지 경로를 입력해 주세요.')).toBeInTheDocument();
 fireEvent.keyDown(dialog,{key:'Escape'});expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(opener).toHaveFocus();
 fireEvent.click(opener);expect(screen.getByLabelText('메뉴 목적지')).toHaveValue('category');expect(screen.getByLabelText('제품종류')).toBeDisabled();
});
