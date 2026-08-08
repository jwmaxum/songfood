// Note: metadata must be in a server component. Title is set via document.title in useEffect below.
'use client';


import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Shield,
  Edit3,
  Check,
  X,
  RefreshCw,
  UserCheck,
  UserX,
  ChevronDown,
} from 'lucide-react';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export type UserRole = 'ROLE_SUPER_ADMIN' | 'ROLE_CRM_BUYER' | 'ROLE_PRODUCT_MANAGER' | 'ROLE_ORDER_SHIPPING' | 'admin' | 'editor' | 'viewer';
type UserStatus = 'active' | 'inactive';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  company?: string;
  department?: string;
}

const ROLE_LABELS: Record<UserRole, { label: string; desc: string; color: string; bg: string }> = {
  ROLE_SUPER_ADMIN: { label: '👑 최고 관리자', desc: '전체 메뉴 및 시스템 관리', color: 'text-purple-400', bg: 'bg-purple-950/50 border-purple-800' },
  ROLE_CRM_BUYER: { label: '🏢 바이어 Inquiry 담당', desc: '도매/해외 바이어 문의 & RFQ 관리', color: 'text-amber-400', bg: 'bg-amber-950/50 border-amber-800' },
  ROLE_PRODUCT_MANAGER: { label: '📦 상품/가격 담당', desc: '상품 CRUD, 가격 수정, 카테고리', color: 'text-emerald-400', bg: 'bg-emerald-950/50 border-emerald-800' },
  ROLE_ORDER_SHIPPING: { label: '🚚 주문/송장 담당', desc: '회원 주문 조회, 결제 확인, 택배 송장 등록', color: 'text-blue-400', bg: 'bg-blue-950/50 border-blue-800' },
  admin: { label: 'Admin', desc: '일반 관리자', color: 'text-red-400', bg: 'bg-red-950/40 border-red-800/50' },
  editor: { label: 'Editor', desc: '콘텐츠 편집자', color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/50' },
  viewer: { label: 'Viewer', desc: '조회 전용', color: 'text-stone-400', bg: 'bg-stone-900 border-stone-700' },
};

// 샘플 직원/서브 관리자 데이터
const SAMPLE_USERS: AdminUser[] = [
  {
    id: '1',
    email: 'ceo@songyoungminfood.com',
    name: '송영민 대표',
    role: 'ROLE_SUPER_ADMIN',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    company: '송영민푸드',
    department: '경영총괄',
  },
  {
    id: '2',
    email: 'global_b2b@songyoungminfood.com',
    name: '김해외 팀장',
    role: 'ROLE_CRM_BUYER',
    status: 'active',
    created_at: '2026-01-15T00:00:00Z',
    company: '송영민푸드',
    department: '해외무역사업부',
  },
  {
    id: '3',
    email: 'product_md@songyoungminfood.com',
    name: '이상품 MD',
    role: 'ROLE_PRODUCT_MANAGER',
    status: 'active',
    created_at: '2026-02-01T00:00:00Z',
    company: '송영민푸드',
    department: '상품기획팀',
  },
  {
    id: '4',
    email: 'shipping_logistics@songyoungminfood.com',
    name: '박배송 대리',
    role: 'ROLE_ORDER_SHIPPING',
    status: 'active',
    created_at: '2026-02-10T00:00:00Z',
    company: '송영민푸드',
    department: '물류배송팀',
  },
];

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured] = useState(isSupabaseConfigured());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('viewer');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    if (!configured) {
      setUsers(SAMPLE_USERS);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, name, role, status, created_at, company')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as AdminUser[]) || []);
    } catch {
      setUsers(SAMPLE_USERS);
      showToast('DB 연결 실패 — 샘플 데이터 표시 중', 'error');
    } finally {
      setLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    department: '해외무역사업부',
    role: 'ROLE_CRM_BUYER' as UserRole,
  });

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email) {
      alert('직원 성함과 이메일을 입력해주세요.');
      return;
    }

    const created: AdminUser = {
      id: 'staff-' + Date.now(),
      name: newStaff.name,
      email: newStaff.email,
      department: newStaff.department,
      role: newStaff.role,
      status: 'active',
      created_at: new Date().toISOString(),
      company: '송영민푸드',
    };

    setUsers((prev) => [created, ...prev]);
    setShowAddModal(false);
    setNewStaff({ name: '', email: '', department: '해외무역사업부', role: 'ROLE_CRM_BUYER' });
    showToast(`서브 관리자 직원 [${created.name}] 님이 권한에 등록되었습니다.`);
  };

  const handleEditStart = (user: AdminUser) => {
    setEditingId(user.id);
    setEditRole(user.role);
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  const handleRoleUpdate = async (userId: string) => {
    setSaving(true);
    try {
      if (configured) {
        const { error } = await supabaseAdmin
          .from('user_profiles')
          .update({ role: editRole })
          .eq('id', userId);
        if (error) throw error;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: editRole } : u))
      );
      showToast('서브 관리자 직무 권한이 업데이트되었습니다.');
    } catch {
      showToast('역할 업데이트 실패', 'error');
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  };

  const handleStatusToggle = async (user: AdminUser) => {
    const newStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      if (configured) {
        const { error } = await supabaseAdmin
          .from('user_profiles')
          .update({ status: newStatus })
          .eq('id', user.id);
        if (error) throw error;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
      showToast(`사용자 ${newStatus === 'active' ? '활성화' : '비활성화'} 완료`);
    } catch {
      showToast('상태 변경 실패', 'error');
    }
  };

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'ROLE_SUPER_ADMIN' || u.role === 'admin').length,
    crm: users.filter((u) => u.role === 'ROLE_CRM_BUYER').length,
    product: users.filter((u) => u.role === 'ROLE_PRODUCT_MANAGER').length,
    shipping: users.filter((u) => u.role === 'ROLE_ORDER_SHIPPING').length,
    active: users.filter((u) => u.status === 'active').length,
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone-800 pb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#c5a880] text-xs font-mono uppercase tracking-widest mb-1">
            <Shield size={14} />
            <span>Admin — Sub-Admin Staff Management</span>
          </div>
          <h1 className="font-serif-luxury text-2xl text-white font-semibold tracking-wide">
            서브 관리자 직원 등록 및 직무 권한 관리
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            바이어 Inquiry, 상품/가격 수정, 회원 주문 및 송장 등록 전담 서브 관리자 권한을 부여합니다.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-[#14532D] hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow"
          >
            <span>+ 서브 관리자 직원 등록</span>
          </button>
          <button
            onClick={fetchUsers}
            className="flex items-center space-x-2 px-3 py-2 bg-stone-900 border border-stone-700 hover:border-stone-600 rounded text-xs text-stone-300 hover:text-white transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Supabase 미연결 배너 */}
      {!configured && (
        <div className="px-4 py-3 bg-amber-950/30 border border-amber-800/50 rounded text-amber-400 text-xs font-mono">
          ⚠ Supabase 미연결 상태입니다. 시범 서브 관리자 데이터를 표시하며, 등록/수정사항이 세션에 실시간 적용됩니다.
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded shadow-xl text-sm font-mono border transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
              : 'bg-red-950/80 border-red-700 text-red-300'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: '전체 서브관리자', value: stats.total, color: 'text-white', icon: Users },
          { label: '바이어 CRM 담당', value: stats.crm, color: 'text-amber-400', icon: Shield },
          { label: '상품/가격 담당', value: stats.product, color: 'text-emerald-400', icon: Edit3 },
          { label: '주문/송장 담당', value: stats.shipping, color: 'text-blue-400', icon: UserCheck },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[#121218] border border-stone-800 rounded-lg p-4 flex items-center space-x-3"
            >
              <Icon size={18} className={stat.color} />
              <div>
                <div className={`text-xl font-bold font-serif-luxury ${stat.color}`}>
                  {stat.value}명
                </div>
                <div className="text-xs text-stone-500 font-mono">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add Sub-Admin Staff */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddStaff}
            className="bg-[#121218] border border-[#c5a880]/50 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="font-bold text-base font-serif-luxury text-amber-400">
                + 서브 관리자 직원 신규 등록
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-white text-xs"
              >
                ✕ 닫기
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-stone-400 font-bold">직원 성함 *</label>
                <input
                  type="text"
                  required
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  placeholder="예: 최도매 팀장"
                  className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-400 font-bold">회사 이메일 계정 *</label>
                <input
                  type="email"
                  required
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  placeholder="staff@songyoungminfood.com"
                  className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-400 font-bold">소속 부서</label>
                <input
                  type="text"
                  value={newStaff.department}
                  onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                  placeholder="예: 해외무역사업부 / 물류관리팀"
                  className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-400 font-bold">담당 직무 서브 관리자 권한 *</label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as UserRole })}
                  className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-amber-400 font-bold focus:outline-none"
                >
                  <option value="ROLE_CRM_BUYER">🏢 바이어 Inquiry & RFQ 담당자 (/admin/crm)</option>
                  <option value="ROLE_PRODUCT_MANAGER">📦 상품 및 가격 수정 담당자 (/admin/products)</option>
                  <option value="ROLE_ORDER_SHIPPING">🚚 회원 주문 & 택배 송장 담당자 (/admin/orders)</option>
                  <option value="ROLE_SUPER_ADMIN">👑 총괄 최고 관리자 (전체 메뉴 접근)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-stone-800 text-stone-300 text-xs font-bold rounded-lg"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#14532D] hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow"
              >
                직원 권한 등록 완료
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#0d0d12] border border-stone-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-800 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest font-mono text-stone-400">
            사용자 목록
          </h2>
          <span className="text-xs text-stone-600 font-mono">{users.length}명</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-stone-500 text-sm">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
            로드 중...
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-stone-500 text-sm">등록된 사용자가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800">
                  <th className="px-5 py-3 text-left text-xs font-mono text-stone-500 uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-mono text-stone-500 uppercase tracking-wider">
                    역할
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-mono text-stone-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-mono text-stone-500 uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-mono text-stone-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {users.map((user) => {
                  const roleInfo = ROLE_LABELS[user.role] || ROLE_LABELS.viewer;
                  const isEditing = editingId === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-stone-900/30 transition-colors">
                      {/* 사용자 정보 */}
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-[#c5a880]/20 border border-[#c5a880]/30 flex items-center justify-center text-[#c5a880] font-bold text-sm font-serif-luxury">
                            {(user.name || user.email)[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white text-sm font-medium">{user.name || '—'}</div>
                            <div className="text-stone-500 text-xs font-mono">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* 역할 */}
                      <td className="px-5 py-4">
                        {isEditing ? (
                          <div className="relative">
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as UserRole)}
                              className="appearance-none w-48 px-3 py-1.5 bg-[#0a0a0c] border border-[#c5a880]/60 rounded text-xs text-amber-400 font-bold focus:outline-none focus:border-[#c5a880]"
                            >
                              <option value="ROLE_CRM_BUYER">🏢 바이어 Inquiry 담당</option>
                              <option value="ROLE_PRODUCT_MANAGER">📦 상품/가격 담당</option>
                              <option value="ROLE_ORDER_SHIPPING">🚚 주문/송장 담당</option>
                              <option value="ROLE_SUPER_ADMIN">👑 최고 관리자</option>
                              <option value="admin">일반 Admin</option>
                              <option value="editor">에디터 (Editor)</option>
                              <option value="viewer">뷰어 (Viewer)</option>
                            </select>
                            <ChevronDown
                              size={12}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                            />
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-mono font-semibold ${roleInfo.bg} ${roleInfo.color}`}
                          >
                            {roleInfo.label}
                          </span>
                        )}
                      </td>

                      {/* 상태 */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleStatusToggle(user)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded border text-xs font-mono transition-colors ${
                            user.status === 'active'
                              ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400 hover:bg-emerald-950/50'
                              : 'bg-stone-900 border-stone-700 text-stone-500 hover:border-stone-600'
                          }`}
                        >
                          {user.status === 'active' ? (
                            <UserCheck size={12} />
                          ) : (
                            <UserX size={12} />
                          )}
                          <span>{user.status === 'active' ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* 가입일 */}
                      <td className="px-5 py-4 text-stone-500 text-xs font-mono">
                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      </td>

                      {/* 작업 */}
                      <td className="px-5 py-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleRoleUpdate(user.id)}
                              disabled={saving}
                              className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#c5a880] hover:bg-[#b59870] text-black rounded text-xs font-semibold transition-colors disabled:opacity-60"
                            >
                              <Check size={12} />
                              <span>{saving ? '저장 중...' : '저장'}</span>
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="flex items-center space-x-1 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs transition-colors"
                            >
                              <X size={12} />
                              <span>취소</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditStart(user)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-stone-900 border border-stone-700 hover:border-[#c5a880]/50 text-stone-300 hover:text-white rounded text-xs transition-colors ml-auto"
                          >
                            <Edit3 size={12} />
                            <span>역할 변경</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RLS 안내 */}
      <div className="p-4 bg-[#0d0d12] border border-stone-800 rounded-lg text-xs text-stone-500 leading-relaxed">
        <strong className="text-stone-400">Supabase RLS 정책 안내:</strong>{' '}
        user_profiles 테이블에 <code className="text-[#c5a880]">role</code> 컬럼이 없는 경우,
        Supabase SQL 에디터에서{' '}
        <code className="text-stone-300">
          ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT &apos;viewer&apos;;
        </code>
        를 실행하세요.
      </div>
    </div>
  );
}
