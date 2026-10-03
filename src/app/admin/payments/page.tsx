import Link from 'next/link';
import {staffPageAccess} from '@/lib/staff-page';
export default async function PaymentsPage(){
 if(!(await staffPageAccess('/admin/payments')).allowed)return <p className="p-8">관리자 권한이 필요합니다.</p>;
 return <main className="p-8"><h1 className="text-2xl font-bold">입금·환불 관리</h1><p className="mt-4">국내 주문별로 은행 거래 확인, 부분입금 및 환불 송금 기록을 관리합니다. 카드 결제는 제공하지 않습니다.</p><Link href="/admin/orders" className="mt-6 inline-block rounded bg-green-900 px-5 py-3 text-white">주문·입금·출고 관리 열기</Link></main>;
}
