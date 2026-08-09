import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import productsData from '../../../../data/products.json';
import journalData from '../../../../data/journal.json';

export const dynamic = 'force-static';

export interface KpiData {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalProducts: number;
  publishedArticles: number;
  totalUsers: number;
  totalMediaItems: number;
  activeMenus: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseCountResult = PromiseSettledResult<{ count?: number | null; data?: any[] | null; error?: unknown }>;

function getCount(result: SupabaseCountResult, fallbackCount: number = 0): number {
  if (result.status === 'fulfilled' && !result.value.error && result.value.count !== null && result.value.count !== undefined) {
    return result.value.count > 0 ? result.value.count : fallbackCount;
  }
  return fallbackCount;
}

function getRevenue(result: SupabaseCountResult): number {
  if (result.status === 'fulfilled' && !result.value.error && result.value.data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (result.value.data as any[]).reduce((sum: number, row: any) => sum + (Number(row.total) || 0), 0);
  }
  return 0;
}

export async function GET() {
  const localProductsCount = Array.isArray(productsData) ? productsData.length : 8;
  const localJournalCount = Array.isArray(journalData) ? journalData.length : 3;

  // Supabase 미설정 시 샘플/로컬 JSON 데이터 반환
  if (!isSupabaseConfigured()) {
    const sample: KpiData = {
      totalOrders: 0,
      pendingOrders: 0,
      totalRevenue: 0,
      totalProducts: localProductsCount,
      publishedArticles: localJournalCount,
      totalUsers: 1,
      totalMediaItems: 12,
      activeMenus: 8,
    };
    return NextResponse.json({ success: true, data: sample, configured: false });
  }

  try {
    // 병렬 집계 쿼리
    const [
      ordersResult,
      pendingOrdersResult,
      revenueResult,
      productsResult,
      articlesResult,
      usersResult,
      mediaResult,
      menusResult,
    ] = await Promise.allSettled([
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
      supabaseAdmin.from('orders').select('total'),
      supabaseAdmin.from('products').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('journal_articles').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabaseAdmin.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('media_library').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('menus').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    const kpi: KpiData = {
      totalOrders:      getCount(ordersResult as SupabaseCountResult, 0),
      pendingOrders:    getCount(pendingOrdersResult as SupabaseCountResult, 0),
      totalRevenue:     getRevenue(revenueResult as SupabaseCountResult),
      totalProducts:    getCount(productsResult as SupabaseCountResult, localProductsCount),
      publishedArticles: getCount(articlesResult as SupabaseCountResult, localJournalCount),
      totalUsers:       getCount(usersResult as SupabaseCountResult, 1),
      totalMediaItems:  getCount(mediaResult as SupabaseCountResult, 12),
      activeMenus:      getCount(menusResult as SupabaseCountResult, 8),
    };

    return NextResponse.json({ success: true, data: kpi, configured: true });
  } catch (error) {
    console.error('[KPI API] Error:', error);
    const fallbackKpi: KpiData = {
      totalOrders: 0,
      pendingOrders: 0,
      totalRevenue: 0,
      totalProducts: localProductsCount,
      publishedArticles: localJournalCount,
      totalUsers: 1,
      totalMediaItems: 12,
      activeMenus: 8,
    };
    return NextResponse.json({ success: true, data: fallbackKpi, configured: false });
  }
}
