import OrderWorkspace from '@/components/orders/OrderWorkspace';
export default async function OrderPage({params}:{params:Promise<{id:string}>}){return <main className="mx-auto max-w-6xl px-5 py-14"><OrderWorkspace initialId={(await params).id}/></main>;}
