import React from 'react';
import { Shield, Lock, FileText, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: '개인정보 처리방침 | 송영민푸드 (Song Youngmin Food)',
  description: '송영민푸드 K-Food 프리미엄 자사몰 개인정보 처리방침 안내입니다.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#070908] text-stone-300 font-sans py-20 px-6">
      <div className="max-w-4xl mx-auto space-y-10 bg-[#121218] border border-stone-800 p-8 sm:p-12 rounded-xl shadow-2xl">
        
        {/* Header */}
        <div className="border-b border-stone-800 pb-6 space-y-3">
          <div className="flex items-center space-x-3 text-[#c5a880]">
            <Shield size={28} />
            <h1 className="font-serif-luxury text-2xl sm:text-3xl text-white font-bold">
              송영민푸드 개인정보 처리방침
            </h1>
          </div>
          <p className="text-xs text-stone-400 font-mono">
            시행일자: 2026년 8월 1일 | 개인정보 보호법 제30조 준수
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-xs sm:text-sm font-light leading-relaxed text-stone-300">
          
          <section className="space-y-3">
            <h2 className="text-base text-white font-serif-luxury font-bold flex items-center space-x-2">
              <span className="w-1.5 h-4 bg-[#c5a880] rounded-full inline-block" />
              <span>제1조 (개인정보의 수집 및 이용 목적)</span>
            </h2>
            <p>
              (주)송영민푸드(이하 &apos;회사&apos;라 함)는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-stone-400">
              <li>**홈페이지 회원 가입 및 관리**: 회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리</li>
              <li>**재화 또는 서비스 제공**: K-Food 상품 배송, 주문서/견적서 발급, 토스페이먼츠 결제 처리, 청구서 발송, 본인인증</li>
              <li>**고객 문의 및 실시간 알림**: 1:1 고객 센터 문의, B2B 도매 상담, 해외 바이어 RFQ 견적 및 실시간 CS 처리</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base text-white font-serif-luxury font-bold flex items-center space-x-2">
              <span className="w-1.5 h-4 bg-[#c5a880] rounded-full inline-block" />
              <span>제2조 (수집하는 개인정보의 항목)</span>
            </h2>
            <div className="bg-[#0a0a0c] p-4 rounded border border-stone-800 space-y-2 font-mono text-xs">
              <div><strong>[회원 가입 및 주문 시]</strong> 성명, 이메일 주소, 비밀번호, 휴대전화번호, 배송지 주소</div>
              <div><strong>[결제 시]</strong> 카드사명, 계좌번호, 결제 승인번호 (토스페이먼츠 암호화 전달)</div>
              <div><strong>[B2B/수출 문의 시]</strong> 회사명, 사업자등록번호, 바이어 국가, 담당자 연락처</div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base text-white font-serif-luxury font-bold flex items-center space-x-2">
              <span className="w-1.5 h-4 bg-[#c5a880] rounded-full inline-block" />
              <span>제3조 (개인정보의 보유 및 이용 기간)</span>
            </h2>
            <p>
              회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-stone-400">
              <li>**계약 또는 청약철회 등에 관한 기록**: 5년 (전자상거래등에서의 소비자보호에 관한 법률)</li>
              <li>**대금결제 및 재화 등의 공급에 관한 기록**: 5년 (전자상거래등에서의 소비자보호에 관한 법률)</li>
              <li>**소비자의 불만 또는 분쟁처리에 관한 기록**: 3년 (전자상거래등에서의 소비자보호에 관한 법률)</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base text-white font-serif-luxury font-bold flex items-center space-x-2">
              <span className="w-1.5 h-4 bg-[#c5a880] rounded-full inline-block" />
              <span>제4조 (개인정보의 제3자 제공 및 위탁)</span>
            </h2>
            <p>
              회사는 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다. 배송 및 결제를 위해 아래 수탁업체에 최소한의 정보가 위탁됩니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-[#0a0a0c] border border-stone-800 rounded">
                <div className="font-bold text-[#c5a880]">택배 배송 위탁</div>
                <div className="text-stone-400">CJ대한통운, 한진택배, 로젠택배 (물류 배송)</div>
              </div>
              <div className="p-3 bg-[#0a0a0c] border border-stone-800 rounded">
                <div className="font-bold text-[#c5a880]">결제 승인 위탁</div>
                <div className="text-stone-400">토스페이먼츠(주) (신용카드/가상계좌 승인)</div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base text-white font-serif-luxury font-bold flex items-center space-x-2">
              <span className="w-1.5 h-4 bg-[#c5a880] rounded-full inline-block" />
              <span>제5조 (개인정보 보호책임자 안내)</span>
            </h2>
            <div className="bg-[#0a0a0c] p-4 rounded border border-stone-800 font-mono text-xs space-y-1">
              <div>성명: 송영민 (대표이사)</div>
              <div>소속: (주)송영민푸드 개인정보 관리팀</div>
              <div>전화: 02-540-1890 | 이메일: privacy@songfood.co.kr</div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
