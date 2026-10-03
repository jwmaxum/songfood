import {getBusinessSettings} from '@/lib/business-settings-server';
import {getActiveMenusTree} from '@/lib/menus-db';
import FooterClient from './FooterClient';
export default async function Footer(){
 const [{profile},menus]=await Promise.all([getBusinessSettings(),getActiveMenusTree('footer')]);
 return <FooterClient menus={menus} profile={profile}/>;
}
