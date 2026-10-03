import { staffPageAccess } from '@/lib/staff-page';
export default async function PaymentsPage() {
  if (!(await staffPageAccess('/admin/payments')).allowed) return <p className="p-8">이 페이지를 볼 수 있는 직원 권한이 필요합니다.</p>;

  return <main className="p-8"><h1 className="text-2xl font-bold">결제 연동 준비 중</h1>
    <p className="mt-4 text-stone-400">서버 주문과 결제 검증을 완료하는 6단계 전까지 결제 승인을 차단합니다. 결제 비밀키는 서버 환경에서 관리합니다.</p></main>;
}
