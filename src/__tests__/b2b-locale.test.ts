import {localizedHref,localeOf,displayDate} from '@/lib/i18n/locale';
import {translateUI} from '@/lib/i18n/translate';
test('two supported languages and deterministic dates',()=>{
 expect(localeOf('en')).toBe('en');expect(localeOf('ar')).toBe('ko');
 expect(displayDate('2026-10-03T23:30:00Z','en')).toBe('04/10/2026');
 expect(displayDate('invalid','en')).toBe('—');
});
test('language URLs retain filters and hashes without rewriting external or protected URLs',()=>{
 expect(localizedHref('/shop?mode=export&page=2#items','en')).toBe('/shop?mode=export&page=2&lang=en#items');
 expect(localizedHref('/account?lang=ko','en')).toBe('/account?lang=en');
 for(const href of ['https://example.invalid','//example.invalid','mailto:qa@example.invalid','/api/account/pi/id/pdf','/admin/settings'])expect(localizedHref(href,'en')).toBe(href);
});
test('translation preserves unknown product data and translates actionable feedback',()=>{
 expect(translateUI('FOB Busan','en')).toBe('FOB Busan');
 expect(translateUI('로그인이 필요하거나 세션이 만료되었습니다.','en')).toContain('Please sign in');
 expect(translateUI('로그인','ko')).toBe('로그인');
});

test('domestic order routes retain Korean while export account remains bilingual',()=>{expect(localizedHref('/checkout','en')).toBe('/checkout?lang=ko');expect(localizedHref('/account/orders/id','en')).toBe('/account/orders/id?lang=ko');});
