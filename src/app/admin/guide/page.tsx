import Link from 'next/link';
import {staffPageAccess} from '@/lib/staff-page';
import {MANUAL} from '@/lib/operations/manual';
export default async function Page(){const access=await staffPageAccess('/admin/guide');if(!access.allowed||!access.staff)return <p className="p-8">직원 권한이 필요합니다.</p>;
 return <main className="min-h-screen space-y-6 bg-stone-50 p-5 text-stone-900 sm:p-8"><h1 className="text-3xl font-bold">운영 매뉴얼</h1><p>담당 역할에서 볼 수 있는 업무 절차입니다. 실제 거래 조건과 검수 자료를 먼저 확인해 주세요.</p>{MANUAL.filter(s=>s.roles.includes(access.staff!.role)).map(s=><section key={s.title} className="rounded-xl border bg-white p-6"><h2 className="text-xl font-bold">{s.title}</h2><ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7">{s.steps.map(t=><li key={t}>{t}</li>)}</ol><Link href={s.href} className="mt-5 inline-block text-sm text-green-900 underline">해당 업무 열기</Link></section>)}</main>;
}
