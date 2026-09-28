'use client';

import { useEffect, useState } from 'react';

type Staff = { id: string; email: string; name: string; role: string; status: string; created_at: string };
const roles = ['admin', 'product_staff', 'inquiry_staff', 'order_staff', 'viewer'];

export default function UsersManager() {
  const [users, setUsers] = useState<Staff[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  async function refresh() {
    const response = await fetch('/api/admin/users', { cache: 'no-store' });
    if (!response.ok) { setError('직원 목록을 불러오지 못했습니다.'); return; }
    setUsers((await response.json()).data);
  }
  useEffect(() => {
    fetch('/api/admin/users', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) { setError('직원 목록을 불러오지 못했습니다.'); return; }
      setUsers((await response.json()).data);
    }).catch(() => setError('직원 목록을 불러오지 못했습니다.'));
  }, []);

  async function change(id: string, update: { role?: string; status?: string }) {
    setBusy(id);
    setError('');
    const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...update }) });
    if (!response.ok) setError((await response.json()).error || '권한 변경에 실패했습니다.');
    else await refresh();
    setBusy('');
  }

  return <main className="p-8 text-stone-100">
    <h1 className="text-2xl font-bold">직원 권한</h1>
    <p className="mt-2 text-sm text-stone-400">Supabase Auth 계정과 연결된 직원의 역할과 상태입니다.</p>
    {error && <p role="alert" className="mt-4 text-red-300">{error}</p>}
    <div className="mt-6 overflow-x-auto rounded border border-stone-800">
      <table className="w-full text-left text-sm"><thead className="bg-stone-900"><tr><th className="p-3">이름</th><th className="p-3">이메일</th><th className="p-3">역할</th><th className="p-3">상태</th></tr></thead>
        <tbody>{users.map((user) => <tr key={user.id} className="border-t border-stone-800">
          <td className="p-3">{user.name}</td><td className="p-3">{user.email}</td>
          <td className="p-3"><select disabled={busy === user.id} value={user.role} onChange={(event) => void change(user.id, { role: event.target.value })} className="rounded bg-stone-900 p-2">{roles.map((role) => <option key={role}>{role}</option>)}</select></td>
          <td className="p-3"><button disabled={busy === user.id} onClick={() => void change(user.id, { status: user.status === 'active' ? 'suspended' : 'active' })} className="rounded border border-stone-600 px-3 py-2">{user.status}</button></td>
        </tr>)}</tbody>
      </table>
    </div>
  </main>;
}
