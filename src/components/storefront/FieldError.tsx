'use client';
import {useLanguage} from '@/lib/i18n/LanguageContext';
export default function FieldError({name,errors}:{name:string;errors:Record<string,string>}){const {t}=useLanguage();return errors[name]?<p id={'error-'+name} className="mt-2 text-xs text-red-800">{t(errors[name])}</p>:null;}
