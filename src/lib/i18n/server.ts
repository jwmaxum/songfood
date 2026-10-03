import 'server-only';
import {headers} from 'next/headers';
import {localeOf,localeText,localizedHref} from './locale';
export async function serverLanguage() {
  const h = await headers(), language = localeOf(h.get('x-songfood-locale'));
  return {language, text:(ko:string,en:string)=>localeText(language,ko,en),
    href:(url:string)=>localizedHref(url,language),path:h.get('x-songfood-path') || '/'};
}
