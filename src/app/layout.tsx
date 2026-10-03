import type {Metadata} from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {AppProviders} from '@/components/providers/AppProviders';
import CartDrawer from '@/components/cart/CartDrawer';
import {serverLanguage} from '@/lib/i18n/server';
import {localizedHref} from '@/lib/i18n/locale';
export const dynamic='force-dynamic';
export async function generateMetadata():Promise<Metadata>{
 const {language,text,path}=await serverLanguage();
 const privatePage=/^\/(admin|account|checkout)(\/|$)/.test(path);
 const title=text('송영민푸드 | 국내 도매·대용량 식품·해외 RFQ','Song Youngmin Food | Bulk Food & Export RFQ');
 const description=text('개인·사업자 대용량 구매와 해외 FOB 견적 문의. 상품별 포장 단위와 최소수량을 확인하세요.','Bulk food for individuals and businesses, and FOB quotations for overseas buyers. Review packaging and minimum quantities.');
 return {metadataBase:new URL(process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'),title,description,
   alternates:{canonical:localizedHref(path,language),languages:{ko:localizedHref(path,'ko'),en:localizedHref(path,'en')}},
   robots:privatePage?{index:false,follow:false}:undefined,
   openGraph:{title,description,url:localizedHref(path,language),locale:language==='en'?'en_US':'ko_KR',images:['/logo.png']}};
}
export default async function RootLayout({children}:{children:React.ReactNode}){
 const {language}=await serverLanguage();
 return <html lang={language} dir="ltr"><body className="min-h-screen flex flex-col bg-[#FAFAF8] text-stone-800 antialiased selection:bg-[#14532D] selection:text-white">
 <AppProviders initialLanguage={language}><Header/><CartDrawer/><div id="main-content" tabIndex={-1} className="min-w-0 flex-grow">{children}</div><Footer/></AppProviders>
 </body></html>;
}
