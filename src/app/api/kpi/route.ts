import { requireStaff } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { failure, json, requireConfiguration } from '@/lib/request-security';
export const dynamic = 'force-dynamic';
export interface KpiData {
  totalOrders:number; pendingOrders:number; totalRevenue:number; totalProducts:number;
  publishedArticles:number; totalUsers:number; totalMediaItems:number; activeMenus:number;
}
export async function GET(request:Request) {
  const denied = await requireStaff(request,['admin','product_staff','inquiry_staff','order_staff']);
  if(denied) return denied;
  try {
    requireConfiguration();
    const results = await Promise.all([
      supabaseAdmin.from('orders').select('id',{count:'exact',head:true}),
      supabaseAdmin.from('orders').select('id',{count:'exact',head:true}).eq('status','Pending'),
      supabaseAdmin.from('orders').select('total').eq('payment_status','DONE'),
      supabaseAdmin.from('products').select('id',{count:'exact',head:true}),
      supabaseAdmin.from('journal_articles').select('id',{count:'exact',head:true}).eq('is_published',true),
      supabaseAdmin.from('customer_accounts').select('id',{count:'exact',head:true}),
      supabaseAdmin.from('media_library').select('id',{count:'exact',head:true}),
      supabaseAdmin.from('menus').select('id',{count:'exact',head:true}).eq('is_active',true),
    ]);
    if(results.some(result=>result.error)) throw new Error('KPI unavailable');
    const data:KpiData = {
      totalOrders:results[0].count || 0,pendingOrders:results[1].count || 0,
      totalRevenue:(results[2].data || []).reduce((sum,row)=>sum+Number('total' in row ? row.total : 0),0),
      totalProducts:results[3].count || 0,publishedArticles:results[4].count || 0,totalUsers:results[5].count || 0,
      totalMediaItems:results[6].count || 0,activeMenus:results[7].count || 0,
    };
    return json({success:true,data,configured:true});
  } catch(error) { return failure(error); }
}
