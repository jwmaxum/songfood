import {useLanguage} from '@/lib/i18n/LanguageContext';
import CartContents from '@/components/cart/CartContents';
export default function CartPage(){
 const {t:ui}=useLanguage();
return <main className="mx-auto max-w-4xl px-5 py-12"><h1 className="mb-3 text-3xl font-bold">{ui("국내 구매함")}</h1><p className="mb-8 text-sm text-stone-600">{ui("상품별 최소구매단위와 수량을 확인해 주세요. 같은 상품도 EA·BOX·CTN을 구분해 관리합니다.")}</p><CartContents/></main>;}
