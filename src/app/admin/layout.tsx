'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  Film,
  FileText,
  Image as ImageIcon,
  ArrowLeft,
  Shield,
  Lock,
  LogOut,
  Users,
  Truck,
  KeyRound,
  Check,
  X,
} from 'lucide-react';

const DEFAULT_ADMIN_ID = 'siteadmin';
const INITIAL_ADMIN_PW = '!admin1004';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  // 로그인 폼 입력값 (Default 표시 제거)
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 비밀번호 변경 모달 상태
  const [isChangePwOpen, setIsChangePwOpen] = useState(false);
  const [currentPwInput, setCurrentPwInput] = useState('');
  const [newPwInput, setNewPwInput] = useState('');
  const [confirmPwInput, setConfirmPwInput] = useState('');
  const [pwChangeError, setPwChangeError] = useState('');
  const [pwChangeSuccess, setPwChangeSuccess] = useState('');

  // 저장된 비밀번호 가져오기 (없으면 초기 임시 비밀번호 !admin1004)
  const getStoredPassword = (): string => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('anatolia_admin_pw') || process.env.NEXT_PUBLIC_ADMIN_PIN || INITIAL_ADMIN_PW;
    }
    return INITIAL_ADMIN_PW;
  };

  useEffect(() => {
    const authStatus = sessionStorage.getItem('anatolia_admin_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPw = getStoredPassword();

    if (usernameInput.trim() === DEFAULT_ADMIN_ID && passwordInput === storedPw) {
      sessionStorage.setItem('anatolia_admin_authenticated', 'true');
      setIsAuthenticated(true);
      setErrorMsg('');
    } else {
      setErrorMsg('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('anatolia_admin_authenticated');
    setIsAuthenticated(false);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwChangeError('');
    setPwChangeSuccess('');

    const storedPw = getStoredPassword();

    if (currentPwInput !== storedPw) {
      setPwChangeError('현재 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!newPwInput || newPwInput.length < 6) {
      setPwChangeError('새 비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }

    if (newPwInput !== confirmPwInput) {
      setPwChangeError('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    localStorage.setItem('anatolia_admin_pw', newPwInput);
    setPwChangeSuccess('비밀번호가 성공적으로 변경되었습니다!');
    setCurrentPwInput('');
    setNewPwInput('');
    setConfirmPwInput('');

    setTimeout(() => {
      setIsChangePwOpen(false);
      setPwChangeSuccess('');
    }, 1500);
  };

  const navLinks = [
    { href: '/admin', label: '실시간 대시보드', icon: LayoutDashboard },
    { href: '/admin/orders', label: '🚚 회원 주문 & 송장 관리', icon: Truck },
    { href: '/admin/crm', label: '🏢 해외/도매 바이어 CRM', icon: Shield },
    { href: '/admin/payments', label: '💳 토스 결제 시스템 설정', icon: Lock },
    { href: '/admin/navigation', label: '메뉴 엔진 (GNB/Footer)', icon: Layers },
    { href: '/admin/hero', label: '히어로 비디오/슬라이더', icon: Film },
    { href: '/admin/products', label: 'K-푸드 & 주류 제품 관리', icon: Shield },
    { href: '/admin/content-blocks', label: '페이지 섹션 콘텐츠', icon: FileText },
    { href: '/admin/journal', label: 'K-레시피 & 저널 에디터', icon: FileText },
    { href: '/admin/media', label: '미디어 라이브러리 CDN', icon: ImageIcon },
    { href: '/admin/users', label: '서브 관리자 직원/권한', icon: Users },
  ];

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-stone-200 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111118] border border-stone-800 rounded-xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[#EAB308]/10 border border-[#EAB308]/30 text-[#EAB308] rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide font-jakarta">
              송영민푸드 관리자 로그인
            </h1>
            <p className="text-xs text-stone-400">
              관리자 계정 아이디와 비밀번호를 입력하세요.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                Admin Username (아이디)
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="아이디 입력..."
                className="w-full px-4 py-3 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                Password (비밀번호)
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="비밀번호 입력..."
                className="w-full px-4 py-3 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none transition-colors"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 p-2.5 rounded text-center">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#c5a880] hover:bg-[#b59870] text-black font-semibold rounded text-sm tracking-wider transition-colors shadow-lg"
            >
              Authorize & Access CMS
            </button>
          </form>

          <div className="pt-4 border-t border-stone-800/60 text-center">
            <Link href="/" className="text-xs text-stone-500 hover:text-stone-300 transition-colors">
              &larr; Return to Main Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-[#0a0a0c]" />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-stone-200 flex flex-col md:flex-row font-sans">
      {/* Integrated Admin Sidebar */}
      <aside className="w-full md:w-64 bg-[#0d0d12] border-r border-stone-800 flex flex-col justify-between p-4 shrink-0">
        <div>
          {/* Admin Header Logo */}
          <div className="pb-6 border-b border-stone-800/80 mb-6 flex justify-between items-center">
            <Link href="/admin" className="flex items-center space-x-2.5">
              <img
                src="/logo.png"
                alt="송영민푸드"
                className="h-8 w-auto object-contain"
              />
              <div className="flex flex-col">
                <span className="font-jakarta text-xs font-extrabold tracking-wider text-white">
                  송영민푸드
                </span>
                <span className="text-[9px] uppercase tracking-[0.15em] text-[#EAB308]">
                  CMS Studio
                </span>
              </div>
            </Link>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1.5" aria-label="Admin navigation">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded text-xs font-medium tracking-wide transition-all ${
                    isActive
                      ? 'bg-[#c5a880] text-black font-semibold shadow-lg'
                      : 'text-stone-400 hover:text-white hover:bg-[#161620]'
                  }`}
                >
                  <Icon size={16} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Password Change, Lock & Logout */}
        <div className="pt-6 border-t border-stone-800/80 mt-6 space-y-2">
          <button
            onClick={() => setIsChangePwOpen(true)}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-stone-900 border border-stone-800 hover:border-[#c5a880]/50 rounded text-xs text-stone-300 hover:text-white transition-colors"
          >
            <KeyRound size={14} className="text-[#c5a880]" />
            <span>Change Password</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-red-950/30 border border-red-900/50 hover:bg-red-900/40 rounded text-xs text-red-300 transition-colors"
          >
            <LogOut size={14} />
            <span>Lock & Logout</span>
          </button>

          <Link
            href="/"
            className="flex items-center justify-center space-x-2 py-2.5 px-3 bg-stone-900 border border-stone-800 hover:border-stone-700 rounded text-xs text-stone-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Return to Live Site</span>
          </Link>
        </div>
      </aside>

      {/* Main Admin View Content */}
      <main className="flex-grow min-w-0 overflow-y-auto">{children}</main>

      {/* Password Change Modal */}
      {isChangePwOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111118] border border-stone-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsChangePwOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center space-x-2 text-[#c5a880]">
              <KeyRound size={20} />
              <h2 className="font-serif-luxury text-lg font-semibold text-white">
                관리자 비밀번호 변경
              </h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  value={currentPwInput}
                  onChange={(e) => setCurrentPwInput(e.target.value)}
                  placeholder="현재 비밀번호..."
                  className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={newPwInput}
                  onChange={(e) => setNewPwInput(e.target.value)}
                  placeholder="새 비밀번호 (6자 이상)..."
                  className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPwInput}
                  onChange={(e) => setConfirmPwInput(e.target.value)}
                  placeholder="새 비밀번호 재입력..."
                  className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                />
              </div>

              {pwChangeError && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 p-2 rounded text-center">
                  {pwChangeError}
                </p>
              )}

              {pwChangeSuccess && (
                <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 p-2 rounded text-center flex items-center justify-center space-x-1">
                  <Check size={14} />
                  <span>{pwChangeSuccess}</span>
                </p>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePwOpen(false)}
                  className="w-1/2 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#c5a880] hover:bg-[#b59870] text-black font-semibold rounded text-xs transition-colors shadow"
                >
                  비밀번호 변경
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
