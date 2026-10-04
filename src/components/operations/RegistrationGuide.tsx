import Link from 'next/link';
export default function RegistrationGuide(){
 return <section aria-label="국내·해외 운영 자료 등록 순서" className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">국내·해외 운영 자료 등록·인수</h2>
 <p className="mt-3 text-sm leading-7">실제 자료를 각 관리자 화면에서 등록한 뒤 출시 상품과 거래를 인수합니다. 회원의 회사·사업자번호 입력은 선택입니다. 아래 사업자 정보는 사이트 운영 회사의 공개 정보입니다.</p>
 <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7"><li><Link href="#business-profile" className="underline">회사·사업자·한영 배송/반품·개인정보 안내</Link>를 등록합니다.</li>
 <li><Link href="/admin/pricing" className="underline">상품별 EA 가격·세금·입수·MOQ</Link>를 실제 자료로 입력·승인하고 <Link href="/admin/quality" className="underline">누락·만료 가격</Link>을 확인합니다. 개인 구매에는 공통·개인 가격이 필요합니다.</li>
 <li>국내: <Link href="/admin/orders#bank-settings" className="underline">은행·계좌·예금주·입금 안내</Link>를 등록합니다. 실제 주문별 배송비·배송 방식·온도 조건은 주문 상세에서 제시합니다.</li>
 <li>해외: <Link href="/admin/pricing#exchange-rate" className="underline">실제 출처·유효기간의 환율</Link>, <Link href="#pi-issuer" className="underline">PI 판매자·결제·송금 정보</Link>를 등록합니다. VAT 제외 FOB 포함 비용을 검수하고 조정은 바이어와 협의합니다.</li>
 <li><Link href="/admin/users" className="underline">등록 직원·권한</Link>을 확인하고 <Link href="/admin/launch" className="underline">운영 담당자·대응 목표</Link>를 지정합니다. 직원 등록·권한 변경·삭제는 최고관리자가 담당합니다.</li>
 <li><Link href="/admin/releases" className="underline">상품별 국내·해외 출시 검수</Link>에서 실제 공개할 SKU를 선택합니다. 자료 변경 시 이전 검수 근거를 다시 확인합니다.</li>
 <li><Link href="/admin/handover#handover-domestic" className="underline">국내 실제 완료 주문 인수</Link>와 <Link href="/admin/handover#handover-export" className="underline">해외 실제 수락 PI 인수</Link>, <Link href="/admin/handover#handover-document_mail" className="underline">허가된 고객의 문서 메일 수신</Link>을 기록합니다. 고객 메일은 <Link href="/admin/mail" className="underline">이메일 운영</Link>에서 검토 후 발송합니다.</li></ol>
 <p className="mt-4 text-sm leading-7"><Link href="/admin/handover" className="underline">국내·해외 현재 보류 조건</Link>을 확인한 뒤 운영자가 공개 범위를 결정합니다. 등록만으로 거래 접수·출시 제한 설정이 바뀌지 않습니다. 업무 시작 후에는 <Link href="/admin/operations" className="underline">초기 운영 점검</Link>을 사용합니다.</p></section>;
}
