import {staffPageAccess} from '@/lib/staff-page';
import OperationsBoard from '@/components/operations/OperationsBoard';
import {queryString} from '@/lib/operations/types';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 if(!(await staffPageAccess('/admin/audit')).allowed)return <p className="p-8">담당자 권한이 필요합니다.</p>;
 const query=queryString(await searchParams);return <OperationsBoard key={query} mode="audit" query={query}/>;
}
