import Link from 'next/link';
import BusinessSettingsEditor from '@/components/operations/BusinessSettingsEditor';
import {staffPageAccess} from '@/lib/staff-page';
import {pageRoles} from '@/lib/staff-permissions';
const settings=[['/admin/pricing','가격·MOQ·환율','실제 근거로 상품별 가격을 검수하고 관리자가 가격·환율을 승인합니다.'],['/admin/crm','PI 발행자·결제 조건','문의 상세 PI 패널에서 관리자가 판매자·결제 조건을 등록합니다.'],['/admin/orders','국내 입금 계좌','주문 화면에서 관리자가 실제 계좌를 등록합니다.'],['/admin/companies','회사·담당자 상태','자동 가입 정책을 유지하며 중지·복구 사유를 기록합니다.'],['/admin/users','직원 권한','필요한 역할만 부여합니다.'],['/admin/navigation','사이트 메뉴','고객에게 보이는 메뉴를 관리합니다.'],['/admin/guide','운영 매뉴얼','배정·검수·발행·입금·출고 인수인계 절차를 확인합니다.']];
export default async function Page(){const a=await staffPageAccess('/admin/settings');if(!a.allowed||!a.staff)return <p className="p-8">직원 권한이 필요합니다.</p>;
 return <main className="min-h-screen space-y-6 bg-stone-50 p-5 text-stone-900 sm:p-8"><h1 className="text-3xl font-bold">운영 설정</h1>{a.staff.role==='admin'&&<BusinessSettingsEditor/>}<div className="grid gap-4 md:grid-cols-2">{settings.filter(([href])=>pageRoles(href).includes(a.staff!.role)).map(([href,title,description])=><Link key={href} href={href} className="rounded-xl border bg-white p-6"><h2 className="font-bold">{title}</h2><p className="mt-3 text-sm">{description}</p></Link>)}</div></main>;
}
