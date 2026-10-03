import Link from 'next/link';
export default function CheckoutPage() {
  return <main className="mx-auto max-w-3xl px-6 py-20">
    <p className="text-sm font-semibold text-green-800">대용량 구매 안내</p>
    <h1 className="mt-3 text-3xl font-bold">주문 조건을 먼저 상담해 주세요</h1>
    <p className="mt-5 leading-7 text-stone-600">온라인 주문·결제는 준비 중입니다. 장바구니는 상품 검토용이며 주문이나 결제가 확정되지 않습니다. 수량, 납기, 배송 조건은 담당자 확인 후 안내합니다.</p>
    <div className="mt-8 flex flex-wrap gap-4"><Link className="rounded bg-green-900 px-6 py-3 text-white" href="/wholesale">개인·국내 도매 구매 문의</Link><Link className="rounded border px-6 py-3" href="/rfq">해외 바이어 RFQ</Link><Link className="rounded border px-6 py-3" href="/cart">장바구니로 돌아가기</Link></div>
  </main>;
}
