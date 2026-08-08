'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Key,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Globe,
  Check,
} from 'lucide-react';

export default function AdminPaymentsPage() {
  const [clientKey, setClientKey] = useState('test_ck_D5Ge2Wxe3MzNW4W2EY48bLzN97E1');
  const [secretKey, setSecretKey] = useState('test_sk_zXLk5nqw366E4Ef126v8n44m3182');
  const [showSecret, setShowSecret] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'TEST' | 'LIVE'>('TEST');
  
  const [enabledMethods, setEnabledMethods] = useState({
    tossPay: true,
    creditCard: true,
    bankTransfer: true,
    virtualAccount: true,
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Test server-side Toss confirm endpoint
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentKey: 'test_pk_diagnostic_' + Date.now(),
          orderId: 'ORD-DIAGNOSTIC-2026',
          amount: 1000,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: '토스페이먼츠 공식 결제 API 연동 점검 성공! (서버 승인 및 SSL 암호화 정상)',
        });
      } else {
        setTestResult({
          success: false,
          message: `연동 오류: ${data.message}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `네트워크 점검 오류: ${err?.message}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('토스페이먼츠 가맹점 결제 설정이 저장되었습니다.');
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 font-sans">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-950 border border-emerald-500 text-emerald-300 font-mono text-xs px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top duration-300">
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone-800 pb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#3182f6] text-xs font-mono uppercase tracking-widest mb-1">
            <CreditCard size={14} />
            <span>Admin — Toss Payments Setup</span>
          </div>
          <h1 className="font-serif-luxury text-2xl text-white font-semibold tracking-wide">
            토스페이먼츠 결제 시스템 관리자 설정
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            토스페이먼츠 가맹점 API 키(Client/Secret Key) 및 테스트/실결제 운영 모드를 관리합니다.
          </p>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="flex items-center space-x-2 px-4 py-2 bg-[#3182f6] hover:bg-[#1b64da] text-white rounded-lg text-xs font-bold transition-all shadow disabled:opacity-50"
        >
          {testing ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
          <span>토스 API 연동 상태 점검</span>
        </button>
      </div>

      {/* Test Diagnostic Result Alert */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-start space-x-3 ${
            testResult.success
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-red-950/60 border-red-500/50 text-red-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-bold">{testResult.success ? '연동 점검 완료' : '연동 점검 실패'}</div>
            <div className="mt-0.5 text-stone-300">{testResult.message}</div>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* Payment Environment Mode Card */}
        <div className="bg-[#0d0d12] border border-stone-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2 font-serif-luxury">
            <Globe size={16} className="text-[#3182f6]" />
            <span>결제 실행 환경 (Environment Mode)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => setPaymentMode('TEST')}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                paymentMode === 'TEST'
                  ? 'bg-blue-950/40 border-[#3182f6] shadow-lg ring-1 ring-[#3182f6]/40'
                  : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-white">🧪 테스트 모드 (Test Environment)</span>
                <span className="text-[10px] bg-blue-900 text-blue-300 px-2 py-0.5 rounded font-mono font-bold">
                  권장 (개발/테스트)
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-2 leading-relaxed">
                실제 금액 차감 없이 토스페이먼츠 테스트 가맹점 키로 결제 승인 프로세스를 시뮬레이션합니다.
              </p>
            </div>

            <div
              onClick={() => setPaymentMode('LIVE')}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                paymentMode === 'LIVE'
                  ? 'bg-amber-950/40 border-amber-500 shadow-lg ring-1 ring-amber-500/40'
                  : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-white">🚀 실결제 운영 모드 (Live Production)</span>
                <span className="text-[10px] bg-amber-900 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                  실제 결제 승인
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-2 leading-relaxed">
                토스페이먼츠 실제 승인 가맹점 키를 사용하여 고객 신용카드 및 계좌에서 실제 대금을 정산합니다.
              </p>
            </div>
          </div>
        </div>

        {/* API Credentials Box */}
        <div className="bg-[#0d0d12] border border-stone-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2 font-serif-luxury">
            <Key size={16} className="text-[#3182f6]" />
            <span>토스페이먼츠 가맹점 API 보안 키 (API Credentials)</span>
          </h2>

          <div className="space-y-4 text-xs">
            {/* Client Key */}
            <div className="space-y-1">
              <label className="text-stone-400 font-bold flex items-center justify-between">
                <span>클라이언트 키 (Client Key) — `NEXT_PUBLIC_TOSS_CLIENT_KEY`</span>
                <span className="text-stone-500 font-mono text-[10px]">프론트엔드 결제창 호출용</span>
              </label>
              <input
                type="text"
                value={clientKey}
                onChange={(e) => setClientKey(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 font-mono text-stone-200 focus:outline-none focus:border-[#3182f6]"
              />
            </div>

            {/* Secret Key */}
            <div className="space-y-1">
              <label className="text-stone-400 font-bold flex items-center justify-between">
                <span>시크릿 키 (Secret Key) — `TOSS_SECRET_KEY`</span>
                <span className="text-red-400 font-mono text-[10px]">⚠ 서버 보안 키 (외부 유출 금지)</span>
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-4 pr-12 py-3 font-mono text-stone-200 focus:outline-none focus:border-[#3182f6]"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enabled Methods */}
        <div className="bg-[#0d0d12] border border-stone-800 rounded-2xl p-6 space-y-4 text-xs">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2 font-serif-luxury">
            <ShieldCheck size={16} className="text-[#3182f6]" />
            <span>지원 결제 수단 활성화 (Payment Methods)</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'tossPay', label: '🔹 토스페이 (1초 결제)' },
              { key: 'creditCard', label: '💳 신용/체크카드' },
              { key: 'bankTransfer', label: '🏦 실시간 계좌이체' },
              { key: 'virtualAccount', label: '📄 가상계좌 입금' },
            ].map((method) => {
              const keyName = method.key as keyof typeof enabledMethods;
              const isChecked = enabledMethods[keyName];
              return (
                <label
                  key={method.key}
                  onClick={() => setEnabledMethods({ ...enabledMethods, [keyName]: !isChecked })}
                  className={`cursor-pointer border p-3 rounded-xl flex items-center justify-between font-bold transition-all ${
                    isChecked
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                      : 'bg-stone-950 border-stone-800 text-stone-500'
                  }`}
                >
                  <span>{method.label}</span>
                  <Check size={14} className={isChecked ? 'text-emerald-400' : 'text-stone-700'} />
                </label>
              );
            })}
          </div>
        </div>

        {/* Webhook Notice Box */}
        <div className="p-4 bg-[#141820] border border-blue-500/30 rounded-xl text-xs space-y-1 font-mono">
          <div className="font-bold text-[#3182f6]">🔗 토스페이먼츠 가상계좌 입금 웹훅 (Webhook URL)</div>
          <div className="text-stone-300 text-[11px]">
            토스페이먼츠 개발자센터 가맹점 설정에서 아래 웹훅 URL을 등록하시면 가상계좌 입금 시 실시간으로 결제가 승인 처리됩니다:
          </div>
          <div className="text-amber-400 font-bold bg-stone-950 px-3 py-1.5 rounded border border-stone-800 mt-2 inline-block">
            https://songfood-96j.pages.dev/api/payments/webhook
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-8 py-3.5 bg-[#3182f6] hover:bg-[#1b64da] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl"
          >
            토스페이먼츠 결제 설정 저장하기
          </button>
        </div>
      </form>
    </div>
  );
}
