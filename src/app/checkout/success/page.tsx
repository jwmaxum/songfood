import Link from 'next/link';
export default function CheckoutSuccessPage() {
  return <main className="mx-auto max-w-3xl px-6 py-20">
    <h1 className="text-3xl font-bold">결제 완료를 확인할 수 없습니다</h1>
    <p className="mt-5 leading-7 text-stone-600">온라인 결제는 아직 제공하지 않습니다. 이 페이지의 주소나 주문번호는 결제·주문 완료 증빙이 아닙니다. 확인이 필요하면 담당자에게 문의해 주세요.</p>
    <Link href="/account/orders" className="mt-8 inline-block rounded bg-green-900 px-6 py-3 text-white">주문·입금 내역 확인</Link>
  </main>;
}
