import {staffPageAccess} from '@/lib/staff-page';
import History from '@/components/operations/History';
import {notFound} from 'next/navigation';
export default async function Page({params}:{params:Promise<{kind:string;id:string}>}){
 const {kind,id}=await params;if(!['inquiry','order'].includes(kind)||!/^[a-f0-9-]{36}$/i.test(id))notFound();
 if(!(await staffPageAccess(kind==='inquiry'?'/admin/crm':'/admin/orders')).allowed)return <p className="p-8">업무 담당자 권한이 필요합니다.</p>;
 return <History kind={kind} id={id}/>;
}
