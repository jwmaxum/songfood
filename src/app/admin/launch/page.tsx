import {staffPageAccess} from '@/lib/staff-page';
import LaunchManager from '@/components/operations/LaunchManager';
export default async function Page(){const a=await staffPageAccess('/admin/launch');
 if(!a.allowed||a.staff?.role!=='admin')return <p className="p-8">관리자 권한이 필요합니다.</p>;
 return <main className="min-h-screen min-w-0 bg-stone-50 p-5 text-stone-900 sm:p-8"><h1 className="text-3xl font-bold">오픈 점검·서비스 중지</h1><LaunchManager/></main>;
}
