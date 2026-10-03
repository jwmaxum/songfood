import { staffPageAccess } from '@/lib/staff-page';
import PricingManager from './PricingManager';
export default async function Page() {
  const {allowed}=await staffPageAccess('/admin/pricing');
  return allowed?<PricingManager/>:<main className="p-8">가격 관리 권한이 필요합니다.</main>;
}
