import {opsStaff} from '@/lib/operations/repository';
import {ApiError, applicationOrigin, failure, json, rateLimit, readJson} from '@/lib/request-security';
import {productId} from '@/lib/product-drafts/validation';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {getBusinessSettings} from '@/lib/business-settings-server';
import {CATALOGUE_PRODUCT_FIELDS, MAX_CATALOGUE_PRODUCTS, type CatalogueProduct, type CatalogueSnapshot} from '@/lib/catalogue/types';

export const dynamic = 'force-dynamic';

// The browser creates the PDF. The Worker only supplies a fresh, explicitly public projection,
// avoiding paid rendering services and Worker CPU/memory limits for large Korean catalogues.
export async function POST(request: Request) {
  try {
    const actor = await opsStaff(request, ['admin', 'product_staff']);
    const body = await readJson(request, 65_536);
    if (Object.keys(body).some(key => !['product_ids', 'language'].includes(key)) ||
        !Array.isArray(body.product_ids) || body.product_ids.length < 1 || body.product_ids.length > MAX_CATALOGUE_PRODUCTS ||
        (typeof body.language !== 'string' || !['ko', 'en'].includes(body.language))) {
      throw new ApiError(400, '상품 1~500개와 카탈로그 언어를 선택해 주세요.');
    }
    const ids = body.product_ids.map(value => productId(value));
    if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new ApiError(400, '선택 상품을 확인해 주세요.');
    await rateLimit(request, 'catalogue-export', 10, 900, actor.id);
    const [{data, error}, business] = await Promise.all([
      supabaseAdmin.from('products').select(CATALOGUE_PRODUCT_FIELDS.join(',')).in('id', ids),
      getBusinessSettings(),
    ]);
    if (error || !data) throw new ApiError(503, '카탈로그 상품을 불러오지 못했습니다.');
    const rows = data as unknown as Record<string, unknown>[];
    const byId = new Map(rows.map(row => [row.id, row]));
    if (ids.some(id => !byId.has(id))) throw new ApiError(409, '선택한 상품이 변경되었거나 삭제되었습니다. 목록을 새로고침해 주세요.');
    const products = ids.map(id => {
      const row = byId.get(id)!;
      return Object.fromEntries(CATALOGUE_PRODUCT_FIELDS.map(key => [key, typeof row[key] === 'string' ? row[key] : ''])) as CatalogueProduct;
    });
    const generated = new Date();
    const localDate = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'}).format(generated);
    const language = body.language as 'ko' | 'en';
    const profile = business.profile;
    const catalogue: CatalogueSnapshot = {
      version: 1, language, generated_at: generated.toISOString(),
      filename: `songfood-catalogue-${language}-${localDate}.pdf`,
      site_origin: applicationOrigin(request),
      seller: {name: profile.name, email: profile.email, phone: profile.phone, export_phone: profile.export_phone},
      products,
    };
    return json({success: true, catalogue});
  } catch (error) { return failure(error); }
}
