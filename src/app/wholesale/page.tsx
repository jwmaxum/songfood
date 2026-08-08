'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Building2, Truck, ShieldCheck, PhoneCall, Send, CheckCircle2, FileSpreadsheet, Layers } from 'lucide-react';

export default function WholesalePage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    ownerName: '',
    businessRegNo: '',
    phone: '',
    email: '',
    businessType: '식당 / 외식업체',
    estimatedMonthlyVolume: '100만원 ~ 300만원',
    products: '냉동만두, 업소용 소스, 떡볶이 밀키트',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-stone-800 font-sans pb-24">
      {/* Header Banner */}
      <div className="bg-[#14532D] text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-emerald-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-900 border border-emerald-700 text-[#EAB308] text-xs font-bold">
              <Building2 size={13} />
              <span>국내 B2B 도매 &amp; 식자재 대량 공급</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold font-jakarta tracking-tight">
              송영민푸드 B2B WHOLESALE
            </h1>
            <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
              식당, 마트, 편의점, 프랜차이즈 및 도매상을 위한 100% 국내산 업소용 대용량 식자재 공급 및 도매가 계약 시스템.
            </p>
          </div>

          <div className="bg-emerald-900/80 border border-emerald-700 p-6 rounded-2xl text-center space-y-2">
            <div className="text-xs text-emerald-200">B2B 도매 전담 직통상담</div>
            <div className="text-2xl font-extrabold text-[#EAB308] font-jakarta">02-1588-1004</div>
            <div className="text-[11px] text-emerald-300">평일 09:00 ~ 18:00 (주말/공휴일 휴무)</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-16">
        
        {/* 4 Core B2B Advantages */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-3">
            <Building2 className="w-8 h-8 text-[#14532D]" />
            <h3 className="text-base font-bold text-stone-900 font-jakarta">업소용 대용량 상품</h3>
            <p className="text-xs text-stone-600">식당 및 사업장을 위한 2kg~10kg 맞춤 규격 단가 제공</p>
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-3">
            <FileSpreadsheet className="w-8 h-8 text-[#14532D]" />
            <h3 className="text-base font-bold text-stone-900 font-jakarta">월 정기 도매가 할인</h3>
            <p className="text-xs text-stone-600">구매 금액 및 정기 발주 규모에 따른 맞춤형 도매율 적용</p>
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-3">
            <Truck className="w-8 h-8 text-[#14532D]" />
            <h3 className="text-base font-bold text-stone-900 font-jakarta">전국 냉동/냉장 정기배송</h3>
            <p className="text-xs text-stone-600">콜드체인 전문 풀필먼트 물류 망을 통한 새벽/익일 배송</p>
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-3">
            <ShieldCheck className="w-8 h-8 text-[#14532D]" />
            <h3 className="text-base font-bold text-stone-900 font-jakarta">HACCP 안전 안심품질</h3>
            <p className="text-xs text-stone-600">위생적이고 철저하게 관리된 100% 정품 식자재 공급</p>
          </div>
        </div>

        {/* Form & Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Business Inquiry Form (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-stone-200 rounded-3xl p-8 shadow-xl space-y-6">
            <div className="border-b border-stone-200 pb-4">
              <h2 className="text-2xl font-extrabold text-stone-900 font-jakarta">신규 B2B 거래 &amp; 도매 견적 문의</h2>
              <p className="text-xs text-stone-500 mt-1">양식을 작성해주시면 24시간 이내 B2B 담당자가 상담 연락드립니다.</p>
            </div>

            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-xl font-bold text-emerald-900 font-jakarta">도매 문의가 정상 접수되었습니다!</h3>
                <p className="text-xs text-emerald-700">
                  담당자가 사업자등록증 검토 후 입력하신 연락처({formData.phone})로 최신 B2B 단가표를 전송해 드립니다.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">상호명 (상호/법인명) *</label>
                    <input
                      required
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="예: 송영민 덤프 푸드식당"
                      className="w-full border border-stone-300 rounded-xl p-3 text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">대표자명 / 담당자 *</label>
                    <input
                      required
                      type="text"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      placeholder="예: 홍길동 사장님"
                      className="w-full border border-stone-300 rounded-xl p-3 text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">사업자등록번호</label>
                    <input
                      type="text"
                      value={formData.businessRegNo}
                      onChange={(e) => setFormData({ ...formData, businessRegNo: e.target.value })}
                      placeholder="000-00-00000"
                      className="w-full border border-stone-300 rounded-xl p-3 text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">연락처 *</label>
                    <input
                      required
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="010-0000-0000"
                      className="w-full border border-stone-300 rounded-xl p-3 text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">이메일 *</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="b2b@company.com"
                      className="w-full border border-stone-300 rounded-xl p-3 text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">업태 및 업종</label>
                    <select
                      value={formData.businessType}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      className="w-full border border-stone-300 rounded-xl p-3 text-stone-900 font-bold"
                    >
                      <option value="식당 / 외식업체">식당 / 전문 외식업체</option>
                      <option value="마트 / 유통업체">마트 / 유통업체</option>
                      <option value="프랜차이즈">프랜차이즈 본사</option>
                      <option value="학교 / 급식업체">학교 / 병원 급식업체</option>
                      <option value="식자재 도매상">식자재 도매상</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">관심 품목 및 문의사항</label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="필요하신 품목(예: 냉동만두 100kg, 포기김치 50kg 등)과 희망 공급 일정 등을 자유롭게 적어주세요."
                    className="w-full border border-stone-300 rounded-xl p-3 text-stone-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-[#14532D] hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2"
                >
                  <Send size={16} />
                  <span>B2B 도매 견적 문의 제출하기</span>
                </button>
              </form>
            )}
          </div>

          {/* Right Product Categories & Process (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#14532D] text-white rounded-3xl p-8 space-y-4 shadow-xl">
              <h3 className="text-xl font-extrabold font-jakarta">B2B 공급 대표 품목</h3>
              <ul className="space-y-2.5 text-xs text-emerald-100 font-medium">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-[#EAB308]" />
                  <span>업소용 왕교자 / 수제 만두 (10kg 대용량 박스)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-[#EAB308]" />
                  <span>전통 포기김치 &amp; 맛김치 (5kg/10kg 업소용 말통)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-[#EAB308]" />
                  <span>비법 불고기 &amp; 갈비 양념소스 (2kg/10kg 업소용)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-[#EAB308]" />
                  <span>스트리트 떡볶이 &amp; 튀김 대량 식자재 세트</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-[#EAB308]" />
                  <span>순살 양념치킨 &amp; 간장치킨 (원육 냉동 대용량)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
