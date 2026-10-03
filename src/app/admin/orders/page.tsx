import {staffPageAccess} from '@/lib/staff-page';
import OrderWorkspace from '@/components/orders/OrderWorkspace';
export default async function AdminOrdersPage(){
 if(!(await staffPageAccess('/admin/orders')).allowed)return <p className="p-8">주문 담당자 권한이 필요합니다.</p>;
 return <div className="min-h-screen bg-stone-50 p-4 sm:p-8"><OrderWorkspace staff/></div>;
}
