/** @jest-environment jsdom */
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import '@testing-library/jest-dom';
import NavigationManager from '@/app/admin/navigation/NavigationManager';
import SiteImageSettings from '@/components/admin/SiteImageSettings';
import MediaManager from '@/app/admin/media/MediaManager';
import CategoryNavigation from '@/components/storefront/CategoryNavigation';
import {SiteImagesProvider} from '@/context/SiteImagesContext';
import CmsLinks from '@/components/layout/CmsLinks';
const mockImage='https://project.supabase.co/storage/v1/object/public/media/new.png';
const mockRefresh=jest.fn();
jest.mock('@/components/admin/ImageUploadField',()=>({__esModule:true,default:({label,value,onChange,disabled}:{label:string;value:string;onChange:(url:string)=>void;disabled?:boolean})=><section aria-label={label}><p>{value}</p><button type="button" disabled={disabled} onClick={()=>onChange(mockImage)}>{label} 파일 선택</button><button type="button" disabled={disabled} onClick={()=>onChange('')}>{label} 사진 제외</button></section>}));
jest.mock('next/link',()=>({__esModule:true,default:({children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a {...props}>{children}</a>}));
jest.mock('@/components/layout/LocalizedLink',()=>({__esModule:true,default:({children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a {...props}>{children}</a>}));
jest.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams(),useRouter:()=>({refresh:mockRefresh})}));
jest.mock('@/lib/i18n/LanguageContext',()=>({useLanguage:()=>({language:'ko',text:(ko:string)=>ko})}));
const originalUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
let fetcher:jest.Mock;
beforeEach(()=>{process.env.NEXT_PUBLIC_SUPABASE_URL='https://project.supabase.co';fetcher=jest.fn(async(url:string,options?:RequestInit)=>({ok:true,json:async()=>({success:true,data:url.startsWith('/api/menus')?(options?.method==='PATCH'?{id:'qa-menu',image_url:mockImage}:[{id:'qa-menu',title:'Contact',url:'/contact',is_active:true,position:'header',parent_id:null,sort_order:0}]):[]})}));global.fetch=fetcher;});
afterAll(()=>{if(originalUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=originalUrl;});
test('editing an existing menu image waits for save and patches only the selected image',async()=>{
 render(<NavigationManager/>);fireEvent.click(await screen.findByRole('button',{name:'Contact 이미지 수정'}));
 const dialog=screen.getByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:'메뉴 이미지 파일 선택'}));
 expect(fetcher.mock.calls.some(([,options])=>options?.method==='PATCH')).toBe(false);
 fireEvent.click(within(dialog).getByRole('button',{name:'메뉴 이미지 저장'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 const patch=fetcher.mock.calls.find(([,options])=>options?.method==='PATCH');expect(JSON.parse(patch![1].body)).toEqual({id:'qa-menu',image_url:mockImage});
});
test('shared logo upload is only a selection until its existing CMS save is requested',async()=>{
 render(<SiteImageSettings/>);const select=await screen.findByRole('button',{name:'공통 로고 파일 선택'});expect(screen.getAllByRole('button',{name:/이미지 저장$/})).toHaveLength(10);
 fireEvent.click(select);expect(fetcher.mock.calls.some(([,options])=>options?.method==='POST')).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'공통 로고 이미지 저장'}));await screen.findByText('공통 로고 이미지를 저장했습니다.');
 const post=fetcher.mock.calls.find(([,options])=>options?.method==='POST');expect(JSON.parse(post![1].body)).toEqual({section_key:'branding_logo',page:'branding',title:'공통 로고',media_url:mockImage,media_type:'image'});
 fireEvent.click(screen.getByRole('button',{name:'공통 로고 사진 제외'}));fireEvent.click(screen.getByRole('button',{name:'공통 로고 이미지 저장'}));
 await waitFor(()=>expect(fetcher.mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(2));
 const clears=fetcher.mock.calls.filter(([,options])=>options?.method==='POST');expect(JSON.parse(clears[1][1].body).media_url).toBe('');
});
test('media upload selection refreshes the existing library without duplicate registration',async()=>{
 render(<MediaManager/>);fireEvent.click(screen.getByRole('button',{name:'UPLOAD / ADD MEDIA'}));
 fireEvent.click(screen.getByRole('button',{name:'라이브러리 이미지 파일 선택'}));
 await screen.findByText('이미지 라이브러리에 반영되었습니다.');
 expect(fetcher.mock.calls.some(([,options])=>options?.method==='POST')).toBe(false);
});
test('stored collection and menu photos render alongside unchanged navigable text',()=>{
 const images={logo:'',collections:{'K-김치/발효식품':mockImage}};
 const {container}=render(<SiteImagesProvider images={images}><CategoryNavigation/></SiteImagesProvider>);
 expect(container.querySelector('img')?.getAttribute('src')).toBe(mockImage);
 expect(screen.getByRole('link',{name:'김치·발효식품'})).toHaveAttribute('href',expect.stringContaining('collection='));
 const menu={id:'qa-menu',title:'Contact',url:'/contact',is_active:true,position:'header' as const,parent_id:null,sort_order:0,image_url:mockImage};
 const view=render(<CmsLinks menus={[menu]}/>);expect(view.container.querySelector('img')?.getAttribute('src')).toBe(mockImage);expect(screen.getByRole('link',{name:'Contact'})).toHaveAttribute('href','/contact');
});
