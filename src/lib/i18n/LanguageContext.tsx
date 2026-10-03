'use client';
import {createContext,useContext,useCallback} from 'react';
import type {ReactNode} from 'react';
import {translateUI} from './translate';
import {DICTIONARIES,LANGUAGES} from './dictionaries';
import {localeOf,localizedHref,type Locale} from './locale';
const LanguageContext = createContext<Locale>('ko');
export function LanguageProvider({children,initialLanguage='ko'}:{children:ReactNode;initialLanguage?:Locale}) {
  return <LanguageContext.Provider value={initialLanguage}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const language = useContext(LanguageContext);
  const t=useCallback((key:string,fallback?:string)=>{const translated=translateUI(key,language);return translated!==key?translated:DICTIONARIES[language][key] || fallback || key;},[language]);
  return {language,dir:'ltr' as const,currentLangInfo:LANGUAGES.find(l=>l.code===language)!,
    text:(ko:string,en:string)=>language==='en'?en:ko,
    href:(url:string)=>localizedHref(url,language),
    t,
    setLanguage:(value:string)=>{
      const next = localeOf(value);
      if (next !== language) window.location.assign(localizedHref(window.location.pathname+window.location.search+window.location.hash,next));
    }};
}
