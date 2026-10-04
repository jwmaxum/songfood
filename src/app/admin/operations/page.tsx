import {staffPageAccess} from '@/lib/staff-page';
import InitialOperationsBoard from '@/components/operations/InitialOperationsBoard';
export default async function Page(){
 const access=await staffPageAccess('/admin/operations');
 if(!access.allowed)return <p className="p-8">담당자 권한이 필요합니다.</p>;
 return <InitialOperationsBoard/>;
}
