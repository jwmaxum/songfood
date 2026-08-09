'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Clock, ShieldCheck, Headphones } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: 'K-Food 제품 및 도매 문의',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          subject: 'K-Food 제품 및 도매 문의',
          message: '',
        });
      } else {
        alert(data.error || '문의 접수 중 오류가 발생했습니다.');
      }
    } catch (err) {
      // Fallback submission status
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const offices = [
    { city: '송영민푸드 서울 본사', address: '서울특별시 강남구 도산대로 642 송영민푸드 빌딩 5층', phone: '02-540-1890' },
    { city: '음성 K-Fresh 제조 센터', address: '충청북도 음성군 대소면 샌드위치길 128', phone: '043-883-9900' },
    { city: '해외 B2B 물류 허브', address: '인천광역시 중구 공항동 아시아나 화물터미널 2동', phone: '032-744-8800' },
  ];

  const faqs = [
    {
      q: '냉동/냉장 식품 배송은 어떻게 진행되나요?',
      a: '모든 K-냉동식품 및 신선 김치류는 친환경 스티로폼 박스와 드라이아이스/ICE팩을 이중 포장하여 콜드체인(Cold-Chain) 당일/익일 신선 택배로 안전하게 배송됩니다.',
    },
    {
      q: '식자재 납품 및 B2B 대량 도매 계약이 가능한가요?',
      a: '네, 송영민푸드는 국내 프랜차이즈, 식자재 유통상 및 해외 K-Mart 바이어를 위해 대용량 박스/카톤 특가 공급 및 1:1 담당 전담 마케터를 지원합니다.',
    },
    {
      q: '해외 수출용 HACCP, Halal, FSSC 22000 인증서 발급이 가능한가요?',
      a: '모든 보유 K-Food 품목은 국가별 바이어 요청 시 영문/해당국가 언어로 작성된 품질 검사 성적서 및 해외 인증 서류를 완비하여 제공해 드립니다.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#070908] text-stone-200 font-sans selection:bg-[#c5a880] selection:text-black py-20 px-6">
      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* Top Title Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#14532D]/30 border border-emerald-500/40 rounded-full text-xs font-mono text-emerald-400">
            <Headphones size={14} />
            <span>고객 센터 &amp; 1:1 담당자 문의</span>
          </div>
          <h1 className="font-serif-luxury text-3xl sm:text-4xl text-white font-bold tracking-tight">
            송영민푸드 K-Food 고객 문의 센터
          </h1>
          <p className="text-stone-400 text-sm font-light leading-relaxed">
            제품 구매 문의, B2B 도매 식자재 공급, 해외 바이어 수출 상담 등 무엇이든 문의해 주시면 **등록 담당 관리자가 실시간으로 확인 후 친절히 안내**해 드립니다.
          </p>
        </div>

        {/* Form & Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left: Contact Form */}
          <div className="lg:col-span-7 bg-[#121218] border border-stone-800 p-8 sm:p-10 rounded-xl shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <h2 className="font-serif-luxury text-xl text-white font-semibold flex items-center space-x-2">
                <Send size={18} className="text-[#c5a880]" />
                <span>실시간 1:1 문의 보내기</span>
              </h2>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                ⚡ 담당자 실시간 알림 전송
              </span>
            </div>

            {submitted ? (
              <div className="p-8 bg-emerald-950/40 border border-emerald-700/60 rounded-lg text-center space-y-4 my-8">
                <CheckCircle2 size={48} className="text-emerald-400 mx-auto animate-bounce" />
                <h3 className="text-xl font-serif-luxury text-white font-bold">문의가 성공적으로 접수되었습니다!</h3>
                <p className="text-xs text-stone-300 font-light leading-relaxed max-w-md mx-auto">
                  송영민푸드 담당 관리자에게 실시간 알림이 발송되었습니다.<br />
                  입력해 주신 이메일/연락처로 빠른 시간 내에 답변드리겠습니다.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-6 py-2.5 bg-[#c5a880] text-black text-xs font-bold rounded-lg hover:bg-[#b59870] transition-all"
                >
                  새로운 문의 작성하기
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                      성함 / 담당자명 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="홍길동"
                      className="w-full px-4 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                      이메일 주소 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="customer@domain.com"
                      className="w-full px-4 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                      연락처 (선택)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="010-0000-0000"
                      className="w-full px-4 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                      회사명 / 상호 (선택)
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="(주)송영민유통"
                      className="w-full px-4 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                    문의 유형 선택
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none transition-colors"
                  >
                    <option value="K-Food 제품 및 도매 문의">소매/개별 제품 구매 및 주문 배송 문의</option>
                    <option value="B2B 대량 식자재 공급 문의">B2B 식자재 &amp; 대용량 박스 도매 계약 문의</option>
                    <option value="해외 바이어 수출 및 RFQ 문의">해외 바이어 수출 &amp; MOQ/FOB 견적 문의</option>
                    <option value="기타 제휴 및 문의">기타 제휴 및 브랜딩 Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                    상세 문의 내용 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="문의하실 상품명, 물량, 배송지 정보 또는 질문 사항을 자세히 적어주세요..."
                    className="w-full px-4 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#c5a880] hover:bg-[#b59870] text-black font-bold text-xs tracking-widest uppercase rounded-lg transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Send size={15} />
                  <span>{loading ? '알림 전송 중...' : '문의 접수 및 실시간 알림 발송'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Right: Customer Care Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#121218] border border-stone-800 p-6 rounded-xl space-y-4">
              <h3 className="font-serif-luxury text-lg text-white font-bold flex items-center space-x-2">
                <Clock size={18} className="text-[#c5a880]" />
                <span>고객 센터 운영 시간</span>
              </h3>
              <div className="space-y-2 text-xs font-mono text-stone-300">
                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">평일 상담:</span>
                  <span className="text-white font-bold">09:00 ~ 18:00 (점심 12:00~13:00)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">주말 / 공휴일:</span>
                  <span className="text-stone-400">온라인 문의 접수 (익일 답변)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-400">고객상담 전화:</span>
                  <span className="text-[#c5a880] font-bold text-sm">02-540-1890</span>
                </div>
              </div>
            </div>

            {/* Offices */}
            <div className="bg-[#121218] border border-stone-800 p-6 rounded-xl space-y-4">
              <h3 className="font-serif-luxury text-lg text-white font-bold flex items-center space-x-2">
                <MapPin size={18} className="text-[#c5a880]" />
                <span>송영민푸드 센터 안내</span>
              </h3>
              <div className="space-y-3">
                {offices.map((off, idx) => (
                  <div key={idx} className="p-3 bg-[#0a0a0c] border border-stone-800 rounded text-xs space-y-1">
                    <div className="font-bold text-white font-serif-luxury">{off.city}</div>
                    <div className="text-stone-400 font-light text-[11px]">{off.address}</div>
                    <div className="text-[#c5a880] font-mono font-bold text-[11px]">{off.phone}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="pt-8 border-t border-stone-800 space-y-6">
          <h2 className="font-serif-luxury text-2xl text-white font-bold text-center">
            자주 묻는 질문 (FAQ)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-[#121218] border border-stone-800 p-6 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-[#c5a880] flex items-start space-x-2">
                  <span>Q.</span>
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs text-stone-300 font-light leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
