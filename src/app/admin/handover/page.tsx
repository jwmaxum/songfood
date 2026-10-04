import {staffPageAccess} from '@/lib/staff-page';
import HandoverManager from '@/components/operations/HandoverManager';
export default async function Page(){const a=await staffPageAccess('/admin/handover');if(!a.allowed)return <p className="p-8">직원 권한이 필요합니다.</p>;return <main className="min-w-0 bg-stone-50 p-5 text-stone-900 sm:p-8"><h1 className="text-3xl font-bold">업무 인수·제한 출시 검수</h1><HandoverManager/></main>;}
