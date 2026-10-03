import {redirect} from 'next/navigation';
import {serverLanguage} from '@/lib/i18n/server';
export default async function FoodLabelingPage(){const {href}=await serverLanguage();redirect(href('/catalogues'));}
