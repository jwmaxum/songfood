import { staffPageAccess } from '@/lib/staff-page';
export default async function OrdersPage() {
  if (!(await staffPageAccess('/admin/orders')).allowed) return <p className="p-8">이 페이지를 볼 수 있는 직원 권한이 필요합니다.</p>;

  return <main className="p-8"><h1 className="text-2xl font-bold">주문 관리 준비 중</h1>
    <p className="mt-4 text-stone-400">실제 주문·배송 관리 기능은 B2B 개발계획 6단계에서 연결합니다. 현재는 주문을 생성하거나 결제·출고·배송 상태를 변경할 수 없습니다.</p></main>;
}
