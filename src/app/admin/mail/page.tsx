import {staffPageAccess} from '@/lib/staff-page';
import MailManager from '@/components/operations/MailManager';
export default async function Page(){const a=await staffPageAccess('/admin/mail');if(!a.allowed||a.staff?.role!=='admin')return <p className="p-8">관리자 권한이 필요합니다.</p>;
 return <main className="min-w-0 bg-stone-50 p-5 text-stone-900 sm:p-8"><h1 className="text-3xl font-bold">고객 이메일 운영</h1><MailManager/></main>;
}
