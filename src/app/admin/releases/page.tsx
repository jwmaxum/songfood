import {staffPageAccess} from '@/lib/staff-page';
import ReleaseManager from '@/components/operations/ReleaseManager';
export default async function Page(){const a=await staffPageAccess('/admin/releases');if(!a.allowed)return <p className="p-8">상품 담당자 권한이 필요합니다.</p>;
 return <main className="min-w-0 bg-stone-50 p-5 text-stone-900 sm:p-8"><h1 className="text-3xl font-bold">출시 상품 검수</h1><ReleaseManager/></main>;
}
