import {UI_EN} from './ui-en';
import type {Locale} from './locale';
export function translateUI(value:string,locale:Locale):string {
 if(locale==='ko')return value;
 const key=value.trim(),translated=UI_EN[key];
 if(translated!==undefined)return value.replace(key,()=>translated);
 // Validation responses retain numeric constraints instead of replacing them with vague errors.
 let match=key.match(/^최소 구매는 (\d+) (EA|BOX|CTN)입니다\. 더 작은 포장 단위로 구매할 수 없습니다\.$/);
 if(match)return 'Minimum purchase: '+match[1]+' '+match[2]+'. Smaller packaging units are not available.';
 match=key.match(/^수출 최소 주문 수량은 (\d+) CTN입니다\.$/);
 if(match)return 'Export MOQ: '+match[1]+' CTN.';
 match=key.match(/^검수된 (EA|BOX|CTN) 입수량이 없습니다\. 견적 문의해 주세요\.$/);
 if(match)return 'The '+match[1]+' pack quantity has not been reviewed. Please request a quotation.';
 match=key.match(/^(\d+)자 이내로 입력해 주세요\. \/ Text is too long\.$/);
 if(match)return 'Enter no more than '+match[1]+' characters.';
 // Explicit bilingual validation messages are authored by this application, not machine-translated trade data.
 if(/[가-힣]/.test(key)&&key.includes(' / ')){const part=key.slice(key.lastIndexOf(' / ')+3);if(!/[가-힣]/.test(part))return part;}
 return value;
}
