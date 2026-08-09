import React from 'react';
import { FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

export const metadata = {
  title: '이용약관 | 송영민푸드 (Song Youngmin Food)',
  description: '송영민푸드 K-Food 프리미엄 자사몰 전자상거래 표준 이용약관입니다.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#070908] text-stone-300 font-sans py-20 px-6">
      <div className="max-w-4xl mx-auto space-y-10 bg-[#121218] border border-stone-800 p-8 sm:p-12 rounded-xl shadow-2xl">
        
        {/* Header */}
        <div className="border-b border-stone-800 pb-6 space-y-3">
          <div className="flex items-center space-x-3 text-[#c5a880]">
            <FileText size={28} />
            <h1 className="font-serif-luxury text-2xl sm:text-3xl text-white font-bold">
              송영민푸드 자사몰 이용약관
            </h1>
          </div>
          <p className="text-xs text-stone-400 font-mono">
            시행일자: 2026년 8월 1일 | 공정거래위원회 표준약관 제10023호 준수
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-xs sm:text-sm font-light leading-relaxed text-stone-300">
          
          <section className="space-y-3">
            <h2 className="text-base text-white font-serif-luxury font-bold flex items-center space-x-2">
              <span className="w-1.5 h-4 bg-[#c5a880] rounded-full inline-block" />
              <span>제1조 (목적)</span>
            </h2>
            <p>
              이 약관은 (주)송영민푸드(전자상거래 사업자)가 운영하는 송영민푸드 온라인 자사몰(이하 &quot;몰&quot;이라 한다)에서 제공하는 K-Food 인터넷 관련 서비스(이하 &quot;서비스&quot;라 한다)를 이용함에 있어 사이버 몰과 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base text-white font-serif-luxury font-bold flex items-center space-x-2">
              <span className="w-1.5 h-4 bg-[#c5a880] rounded-full inline-block" />
              <span>제2조 (구매신청 및 계약의 성립)</span>
            </h2>
            <p>
              &quot;몰&quot;이용자는 &quot;몰&quot;상에서 다음 또는 이와 유사한 방법에 의하여 구매를 신청하며, &quot;몰&quot;은 이용자가 구매신청을 함에 있어서 다음의 각 내용을 알기 쉽게 제공하여야 합니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-stone-400">
              <li>재화 등의 검색 및 선택 (낱개 / 10개입 Box / 카톤 포장 단위)</li>
              <li>성명, 주소, 전화번호, 이메일 주소 등의 입력</li>
              <li>약관내용, 청약철회권이 제한되는 서비스, 배송비 등의 비용부담과 관련한 내용에 대한 확인</li>
              <li>결제방법의 선택 (신용카드, 가상계좌, 토스페이먼츠 결제)</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base text-white font-serif-luxury font-bold flex items-center space-x-2">
              <span className="w-1.5 h-4 bg-[#c5a880] rounded-full inline-block" />
              <span>제3조 (배송 및 결제 조건)</span>
            </h2>
            <div className="bg-[#0a0a0c] p-4 rounded border border-stone-800 space-y-2 font-mono text-xs">
              <div><strong>[배송비 정책]</strong> 결제 금액 50,000원 미만 시 배송비 3,000원이 자동 부과되며, 50,000원 이상 구매 시 무료 배송됩니다.</div>
              <div><strong>[콜드체인 신선 배송]</strong> K-냉동식품 및 신선 포기김치 등 온도에 민감한 상품은 드라이아이스/ICE팩 이중포장 당일 출고됩니다.</div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base text-white font-serif-luxury font-bold flex items-center space-x-2">
              <span className="w-1.5 h-4 bg-[#c5a880] rounded-full inline-block" />
              <span>제4조 (청약철회 및 반품/환불)</span>
            </h2>
            <p>
              &quot;몰&quot;과 재화등의 구매에 관한 계약을 체결한 이용자는 수령한 날로부터 7일 이내에 청약의 철회를 할 수 있습니다. 단, 다음 각 호에 해당하는 경우에는 반품 및 교환이 제한될 수 있습니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-stone-400">
              <li>이용자에게 책임 있는 사유로 재화 등이 멸실 또는 훼손된 경우</li>
              <li>신선 냉동/냉장 식품의 특성상 개봉 후 복원이 불가능하거나 상품 가치가 현저히 감소한 경우</li>
              <li>시간의 경과에 의하여 재판매가 곤란할 정도로 재화등의 가치가 현저히 감소한 경우</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base text-white font-serif-luxury font-bold flex items-center space-x-2">
              <span className="w-1.5 h-4 bg-[#c5a880] rounded-full inline-block" />
              <span>제5조 (관할법원 및 분쟁해결)</span>
            </h2>
            <p>
              &quot;몰&quot;과 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은 제소 당시의 이용자의 주소지에 의하고, 주소가 없는 경우에는 거소를 관할하는 지방법원의 전속관할로 합니다.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
