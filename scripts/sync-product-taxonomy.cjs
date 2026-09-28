/*
 * Run `node scripts/sync-product-taxonomy.cjs` to preview changes.
 * Run with --apply to update Supabase and data/products.json.
 * The backup is written before the first remote update.
 */
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'data', 'products.json');
const backupPath = path.join(root, 'data', 'product-supabase-backup-2026-09-28.json');
const taxonomy = require(path.join(root, 'data', 'product-taxonomy.json'));
const placeholder = '/images/products/coming-soon.png';

function classification(id) {
  if (id.startsWith('prod-kmc-') || id === 'prod-kimchi') return ['K-김치/발효식품', '김치 & 발효식품'];
  if (id.startsWith('prod-mnd-') || id === 'prod-1') return ['K-만두/냉동식품', '만두 & 교자'];
  if (id.startsWith('prod-hmr-') || id === 'prod-3' || id === 'prod-5') {
    if (id.includes('tteok') || id === 'prod-3') return ['K-간편식/HMR', '떡볶이 & 밀키트'];
    if (['prod-hmr-sagol-soup', 'prod-hmr-samgye-tang', 'prod-hmr-doenjang-stew'].includes(id)) return ['K-간편식/HMR', '국 & 탕류'];
    return ['K-간편식/HMR', '간편식 & 조리육류'];
  }
  if (id.startsWith('prod-ndl-')) {
    if (id.includes('ramen') || id.includes('fire-chicken')) return ['K-면류/라면', '라면'];
    if (id.includes('dang')) return ['K-면류/라면', '당면'];
    return ['K-면류/라면', '생면 & 국수'];
  }
  if (id.startsWith('prod-sau-') || id === 'prod-sauce') {
    if (['prod-sau-gochujang-1k', 'prod-sau-doenjang-1k', 'prod-sau-ssamjang-500'].includes(id)) return ['K-소스/장류', '장류'];
    if (id === 'prod-sau-tteok-powder') return ['K-소스/장류', '분말 조미료'];
    return ['K-소스/장류', '소스 & 양념'];
  }
  if (id.startsWith('prod-sea-')) {
    if (id.includes('gwangcheon') || id.includes('doljaban')) return ['K-김/수산가공', '김 가공품'];
    if (id.includes('miyeok') || id.includes('dasima')) return ['K-김/수산가공', '해조류'];
    if (id.includes('fishcake')) return ['K-김/수산가공', '어묵 & 수산가공'];
    return ['K-김/수산가공', '건어물 & 안주류'];
  }
  if (id.startsWith('prod-snk-') || id === 'prod-snack') return ['K-스낵/전통과자', id.includes('yakgwa') ? '전통과자' : '스낵 & 과자'];
  if (id.startsWith('prod-bev-') || id === 'prod-2' || id === 'prod-4') {
    if (id.includes('soju') || id === 'prod-2') return ['K-주류/전통주', '증류식 소주'];
    if (id.includes('makgeolli') || id === 'prod-4') return ['K-주류/전통주', '막걸리 & 탁주'];
    return ['K-음료/전통차', id.includes('sikhye') ? '전통 음료' : '전통차'];
  }
  throw new Error(`분류 미정 상품: ${id}`);
}

function normalize(product, isOriginal45) {
  const [collection, category] = classification(product.id);
  if (!taxonomy.some((entry) => entry.collection === collection && entry.categories.includes(category))) {
    throw new Error(`분류 기준에 없는 조합: ${product.id}`);
  }
  return {
    ...product,
    collection,
    category,
    image_url: placeholder,
    certifications: [],
    rating: null,
    reviews_count: 0,
    ...(isOriginal45 ? { finish: '', color: '', look: '' } : {}),
    ...(product.id === 'prod-1' ? { sku: 'KFD-BIBI-MANDU-LEGACY' } : {}),
    ...(product.id === 'prod-kimchi' ? { sku: 'KFD-KMC-POGGI-5K-LEGACY' } : {}),
    ...(!isOriginal45 ? {
      is_featured: false, is_todays_deal: false, is_best_seller: false,
      carton_qty: 0, wholesale_discount_rate: 0,
      wholesale_price_krw: null, export_price_usd: null,
      carton_size: null, gross_weight: null, cbm: null, moq_cartons: null,
      hs_code: null, production_lead_time: null, export_packaging: null,
      loading_port: null, target_markets: [],
    } : {}),
  };
}

function readEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
    const index = line.indexOf('=');
    if (index <= 0 || line.trim().startsWith('#')) continue;
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

async function main() {
  const local = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (![45, 53].includes(local.length)) throw new Error(`원본/동기화 상품 수 확인 실패: ${local.length}개`);
  const original45 = local.slice(0, 45);
  const env = readEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase 설정 없음');
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: remote, error } = await db.from('products').select('*').order('id');
  if (error) throw error;
  if (!remote || remote.length !== 53) throw new Error(`원격 53개 확인 실패: ${remote?.length ?? 0}개`);
  const localIds = new Set(original45.map((item) => item.id));
  const remoteIds = new Set(remote.map((item) => item.id));
  if (original45.some((item) => !remoteIds.has(item.id))) throw new Error('Supabase에 없는 원본 상품이 있습니다.');
  const extra = remote.filter((item) => !localIds.has(item.id));
  if (extra.length !== 8) throw new Error(`추가 8개 확인 실패: ${extra.length}개`);
  const normalizedLocal = [...original45.map((item) => normalize(item, true)), ...extra.map((item) => normalize(item, false))];
  const counts = Object.fromEntries(taxonomy.map((entry) => [entry.collection, normalizedLocal.filter((item) => item.collection === entry.collection).length]));
  console.log(JSON.stringify({ original: original45.length, legacy: extra.length, total: normalizedLocal.length, counts }, null, 2));
  if (!process.argv.includes('--apply')) return;

  if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, JSON.stringify(remote, null, 2) + '\n');
  for (const original of remote) {
    const updated = normalize(original, localIds.has(original.id));
    const changes = {
      collection: updated.collection,
      category: updated.category,
      image_url: updated.image_url,
      certifications: [],
      rating: null,
      reviews_count: 0,
      sku: updated.sku,
      ...(!localIds.has(original.id) ? {
        is_featured: false, is_todays_deal: false, is_best_seller: false,
        carton_qty: 0, wholesale_discount_rate: 0,
        wholesale_price_krw: null, export_price_usd: null,
        carton_size: null, gross_weight: null, cbm: null, moq_cartons: null,
        hs_code: null, production_lead_time: null, export_packaging: null,
        loading_port: null, target_markets: [],
      } : {}),
      ...(localIds.has(original.id) ? { finish: '', color: '', look: '' } : {}),
    };
    const { error: updateError } = await db.from('products').update(changes).eq('id', original.id);
    if (updateError) throw new Error(`${original.id}: ${updateError.message}`);
  }
  fs.writeFileSync(dataPath, JSON.stringify(normalizedLocal, null, 2) + '\n');
  const { data: verified, error: verifyError } = await db.from('products').select('id,collection,category,image_url,certifications,sku,is_featured,wholesale_price_krw,export_price_usd,hs_code,rating,reviews_count');
  if (verifyError) throw verifyError;
  const expected = new Map(normalizedLocal.map((item) => [item.id, item]));
  if (verified.length !== 53 || new Set(verified.map((item) => item.sku)).size !== 53 || verified.some((item) => {
    const localItem = expected.get(item.id);
    return !localItem || !taxonomy.some((entry) => entry.collection === item.collection && entry.categories.includes(item.category)) ||
      item.collection !== localItem.collection || item.category !== localItem.category || item.sku !== localItem.sku ||
      item.image_url !== placeholder || item.certifications?.length || item.rating !== null || item.reviews_count !== 0 ||
      (!localIds.has(item.id) && (item.is_featured || item.wholesale_price_krw !== null || item.export_price_usd !== null || item.hs_code !== null));
  })) {
    throw new Error('원격 DB 사후 검증 실패');
  }
  console.log('Supabase 53개 및 data/products.json 53개 동기화 검증 완료');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
