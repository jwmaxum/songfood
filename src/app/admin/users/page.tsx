import {staffPageAccess} from '@/lib/staff-page';
import {isSuperAdmin} from '@/lib/staff-management';
import UsersManager from './UsersManager';
export const dynamic='force-dynamic';
export default async function UsersPage(){
 const a=await staffPageAccess('/admin/users');
 if(!a.allowed||!a.staff||!await isSuperAdmin(a.staff.id))return <main className="p-8 text-stone-100"><h1 className="text-2xl font-bold">하위관리자·권한</h1><p className="mt-4">최고관리자 jwmaxum@gmail.com만 직원 등록·권한 수정·삭제를 처리할 수 있습니다.</p></main>;
 return <UsersManager/>;
}
