'use client';

import React, { useState, useEffect } from 'react';
import { getStoredExchangeRate, saveStoredExchangeRate, DEFAULT_EXCHANGE_RATE } from '@/lib/exchange-rate';
import { RefreshCw, CheckCircle2, DollarSign } from 'lucide-react';

export default function ExchangeRateWidget() {
  const [rate, setRate] = useState<number>(DEFAULT_EXCHANGE_RATE);
  const [inputVal, setInputVal] = useState<string>('1450');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const current = getStoredExchangeRate();
    setRate(current);
    setInputVal(current.toString());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(inputVal);
    if (isNaN(num) || num < 500 || num > 3000) {
      alert('유효한 환율 금액(예: 1450)을 입력해주세요.');
      return;
    }
    saveStoredExchangeRate(num);
    setRate(num);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    saveStoredExchangeRate(DEFAULT_EXCHANGE_RATE);
    setRate(DEFAULT_EXCHANGE_RATE);
    setInputVal(DEFAULT_EXCHANGE_RATE.toString());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="bg-[#121218] border border-amber-500/40 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-800 pb-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 text-xs font-mono uppercase tracking-widest text-[#EAB308] bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-full mb-1">
            <DollarSign size={13} />
            <span>DAILY USD / KRW EXCHANGE RATE</span>
          </div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>💱 해외 수출 &amp; RFQ 일일 적용 환율 설정</span>
          </h3>
          <p className="text-xs text-stone-400">
            해외바이어 RFQ 견적 신청 페이지 및 Pro Forma Invoice 발행 시 적용되는 환율입니다. (기본값: ₩1,450원)
          </p>
        </div>

        <div className="text-right bg-stone-900 px-4 py-2 rounded-xl border border-stone-800 font-mono">
          <span className="text-[10px] text-stone-400 block uppercase font-bold">현재 적용 환율</span>
          <span className="text-xl font-extrabold text-[#EAB308]">₩{rate.toLocaleString()}원 / $1 USD</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3 top-2.5 text-xs font-bold text-stone-400 font-mono">₩</span>
          <input
            type="number"
            step="1"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="w-full bg-[#0A0A0C] border border-stone-700 rounded-xl py-2 pl-8 pr-16 text-xs text-white font-bold font-mono focus:border-amber-400 focus:outline-none"
            placeholder="1450"
          />
          <span className="absolute right-3 top-2.5 text-xs font-bold text-stone-400 font-mono">KRW / $1 USD</span>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            type="submit"
            className="flex-1 sm:flex-none px-5 py-2 bg-[#EAB308] hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs transition-all shadow-md"
          >
            환율 변경 저장
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
            title="기본값 1,450원으로 초기화"
          >
            <RefreshCw size={13} />
            <span>기본값(1,450원)</span>
          </button>
        </div>
      </form>

      {savedSuccess && (
        <div className="text-xs text-emerald-400 font-bold flex items-center space-x-1.5 bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-lg animate-in fade-in duration-200">
          <CheckCircle2 size={14} />
          <span>환율이 ₩{rate.toLocaleString()}원 / $1 USD로 성공적으로 저장되었습니다. RFQ 계산기에 즉시 반영됩니다.</span>
        </div>
      )}
    </div>
  );
}
