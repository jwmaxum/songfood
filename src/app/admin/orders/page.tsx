import {staffPageAccess} from '@/lib/staff-page';
import OrderWorkspace from '@/components/orders/OrderWorkspace';
export default async function AdminOrdersPage({searchParams}:{searchParams:Promise<{order?:string}>}){
 if(!(await staffPageAccess('/admin/orders')).allowed)return <p className="p-8">주문 담당자 권한이 필요합니다.</p>;
 const {order}=await searchParams;
 return <div className="min-h-screen bg-stone-50 p-4 sm:p-8"><OrderWorkspace staff initialId={order&&/^[a-f0-9-]{36}$/i.test(order)?order:undefined}/></div>;
}
