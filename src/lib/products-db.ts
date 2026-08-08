import fs from 'fs';
import path from 'path';
import { ProductItem } from './types';

const PRODUCTS_DATA_PATH = path.join(process.cwd(), 'data', 'products.json');

const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    name: 'CJ 비비고 수제 프리미엄 왕교자 만두 (Bibigo Pork & Leek Mandu)',
    name_en: 'Bibigo Premium Pork & Leek Mandu Dumplings',
    collection: 'K-냉동식품',
    category: '만두 & 교자',
    price: 18000,
    original_price: 22000,
    stock: 150,
    rating: 4.9,
    reviews_count: 88,
    sku: 'KFD-BIBI-MANDU',
    format: '1.05kg 패밀리팩',
    finish: '-40°C IQF 급속냉동',
    color: '노릇노릇한 바삭함',
    look: '수제 손주름 왕교자',
    image_url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80',
    description: '100% 얇은 피 속 국내산 돼지고기와 신선한 부추, 당면이 듬뿍 들어간 대한민국 대표 비비고 왕교자 만두.',
    thickness: '1.05 kg',
    origin: '대한민국 (Korea)',
    is_featured: true,
    is_todays_deal: true,
    is_best_seller: true,
    deal_discount_percent: 18,

    // Domestic Specs
    brand: '비비고 (Bibigo)',
    manufacturer: 'CJ제일제당 / 송영민푸드 유통',
    country_of_origin: '대한민국',
    net_weight: '1,050g',
    package_size: '250 x 300 x 50 mm',
    shelf_life: '제조일로부터 12개월 (냉동 보관)',
    storage: '영하 18℃ 이하 냉동 보관 (-18°C Deep Frozen)',
    ingredients: '돼지고기(국내산) 32%, 밀가루(미국/호주산), 부추(국내산), 당면, 대파, 양파, 마늘, 참기름, 정제소금, 후추',
    allergens: '밀, 돼지고기, 대두, 조개류(굴) 함유',
    certifications: ['HACCP', 'FSSC 22000', 'ISO'],

    // Export Specs
    carton_qty: 10,
    carton_size: '480 x 320 x 240 mm',
    gross_weight: 11.2,
    cbm: 0.037,
    moq_cartons: 50,
    hs_code: '1902.20-1000',
    production_lead_time: '14 Days',
    export_packaging: 'Cold-Chain Reefer Carton Box (-18°C)',
    loading_port: 'Busan Port, Korea',
    export_price_usd: 14.50,
    wholesale_price_krw: 15300, // 15% discount off 18,000 KRW
    target_markets: ['USA', 'Japan', 'China', 'Europe', 'Southeast Asia']
  },
  {
    id: 'prod-kimchi',
    name: '송영민푸드 명품 전통 포기김치 5kg (Premium Artisanal Poggi Kimchi)',
    name_en: 'Song Youngmin Food Premium Artisanal Poggi Kimchi 5kg',
    collection: 'K-전통식품',
    category: '김치 & 발효식품',
    price: 32000,
    original_price: 40000,
    stock: 200,
    rating: 5.0,
    reviews_count: 142,
    sku: 'KFD-KMC-POGGI-5K',
    format: '5kg 업소용/가정용',
    finish: '자연 유산균 발효',
    color: '진한 붉은빛 갓담근 김치',
    look: '해남 배추 수제 포기김치',
    image_url: 'https://images.unsplash.com/photo-1583224964978-2257b960c3d3?auto=format&fit=crop&w=800&q=80',
    description: '100% 해남 배추와 고춧가루, 황석어젓, 멸치액젓으로 정성껏 담근 한국 전통 발효 명품 포기김치.',
    thickness: '5 kg',
    origin: '대한민국 (Korea)',
    is_featured: true,
    is_todays_deal: false,
    is_best_seller: true,

    // Domestic Specs
    brand: '송영민푸드 (Song Youngmin Food)',
    manufacturer: '송영민푸드 (주)',
    country_of_origin: '대한민국',
    net_weight: '5,000g',
    package_size: '300 x 300 x 250 mm',
    shelf_life: '제조일로부터 6개월 (냉장 0~4℃)',
    storage: '0~4℃ 신선 냉장 보관',
    ingredients: '절임배추 70%(배추:국내산, 천일염:국내산), 무(국내산), 고춧가루(국내산) 5.5%, 멸치액젓, 마늘, 생강, 파',
    allergens: '새우, 대두 함유 (Halal/Vegan 버전 별도 제공)',
    certifications: ['HACCP', 'Halal', 'Vegan', 'FSSC 22000', 'Gluten Free'],

    // Export Specs
    carton_qty: 4,
    carton_size: '520 x 360 x 280 mm',
    gross_weight: 21.5,
    cbm: 0.052,
    moq_cartons: 40,
    hs_code: '2005.99-1000',
    production_lead_time: '10 Days',
    export_packaging: 'Vacuum Sealed Leak-Proof Gas-Barrier Pouch in Cold CTN',
    loading_port: 'Busan Port / Incheon Port',
    export_price_usd: 24.80,
    wholesale_price_krw: 27200, // 15% discount off 32,000 KRW
    target_markets: ['USA', 'Japan', 'Middle East', 'Europe', 'Southeast Asia']
  },
  {
    id: 'prod-3',
    name: 'K-수제 눈꽃 떡볶이 & 모둠튀김 3인분 밀키트 (K-Street Tteokbokki Kit)',
    name_en: 'K-Street Spicy Tteokbokki & Assorted Tempura Kit',
    collection: 'K-간편식/HMR',
    category: '떡볶이 & 밀키트',
    price: 15000,
    original_price: 19000,
    stock: 95,
    rating: 4.8,
    reviews_count: 64,
    sku: 'KFD-TTEOK-KIT',
    format: '650g 밀키트 (3인분)',
    finish: '급속동결 비법 소스',
    color: '매콤달콤 크림슨 레드',
    look: '쫄깃한 쌀떡 & 야채/김말이 튀김',
    image_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
    description: '쫄깃한 쌀떡과 매콤달콤 비법 양념소스, 김말이·야채튀김이 어우러진 스트리트 K-떡볶이 수제 밀키트.',
    thickness: '650g',
    origin: '서울, 대한민국',
    is_featured: true,
    is_todays_deal: true,
    is_best_seller: true,
    deal_discount_percent: 21,

    // Domestic Specs
    brand: '송영민푸드 (Song Youngmin Food)',
    manufacturer: '송영민푸드 밀키트 LAB',
    country_of_origin: '대한민국',
    net_weight: '650g',
    package_size: '220 x 260 x 40 mm',
    shelf_life: '12개월 (냉동 보관)',
    storage: '영하 18℃ 이하 냉동 보관',
    ingredients: '쌀떡 60%(쌀:국내산), 떡볶이 분말양념, 부산 어묵, 김말이 튀김, 야채 튀김',
    allergens: '밀, 대두, 오징어, 대두 함유',
    certifications: ['HACCP', 'Halal', 'Gluten Free'],

    // Export Specs
    carton_qty: 16,
    carton_size: '450 x 350 x 220 mm',
    gross_weight: 11.8,
    cbm: 0.035,
    moq_cartons: 60,
    hs_code: '1902.30-9000',
    production_lead_time: '14 Days',
    export_packaging: 'Frozen Cold-Chain Carton',
    loading_port: 'Busan Port, Korea',
    export_price_usd: 11.20,
    wholesale_price_krw: 12750, // 15% discount off 15,000 KRW
    target_markets: ['USA', 'Southeast Asia', 'Japan', 'Middle East']
  },
  {
    id: 'prod-5',
    name: '크리스피 순살 양념 & 간장 반반 치킨 (K-Fried Chicken Half & Half)',
    name_en: 'Korean Boneless Fried Chicken Half & Half (Sweet & Garlic Soy)',
    collection: 'K-냉동식품',
    category: '치킨 & 안주',
    price: 24000,
    original_price: 29000,
    stock: 110,
    rating: 5.0,
    reviews_count: 145,
    sku: 'KFD-CHIK-HALF',
    format: '800g (400g x 2팩)',
    finish: '더블 에어크리스피 공법',
    color: '마늘간장 & 달콤 양념 글레이즈',
    look: '100% 닭다리살 순살 치킨',
    image_url: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=800&q=80',
    description: '에어프라이어 15분으로 에어크리스피 겉바속촉 완성! 달콤매콤 양념소스크런치와 단짠 마늘간장치킨 반반 세트.',
    thickness: '800g',
    origin: '대한민국 (Korea)',
    is_featured: true,
    is_todays_deal: true,
    is_best_seller: true,
    deal_discount_percent: 17,

    // Domestic Specs
    brand: '송영민 K-치킨 (Song K-Chicken)',
    manufacturer: '송영민푸드 (주)',
    country_of_origin: '대한민국',
    net_weight: '800g',
    package_size: '240 x 280 x 60 mm',
    shelf_life: '12개월 (냉동 보관)',
    storage: '영하 18℃ 이하 냉동 보관',
    ingredients: '닭다리살(국내산) 70%, 튀김옷(밀가루, 옥수수전분), 양념치킨소스, 마늘간장소스',
    allergens: '닭고기, 밀, 대두, 토마토 함유',
    certifications: ['HACCP', 'FSSC 22000'],

    // Export Specs
    carton_qty: 12,
    carton_size: '500 x 360 x 260 mm',
    gross_weight: 10.5,
    cbm: 0.046,
    moq_cartons: 50,
    hs_code: '1602.32-1000',
    production_lead_time: '14 Days',
    export_packaging: 'Export Cold-Chain Master Carton',
    loading_port: 'Busan Port, Korea',
    export_price_usd: 18.00,
    wholesale_price_krw: 20400, // 15% discount off 24,000 KRW
    target_markets: ['USA', 'Japan', 'Southeast Asia', 'Europe']
  },
  {
    id: 'prod-sauce',
    name: '송영민 수제 불고기 & 갈비 비법 양념소스 2kg (Artisanal Bulgogi Sauce 2kg)',
    name_en: 'Song Youngmin Artisanal Korean Bulgogi & Galbi Sauce 2kg',
    collection: 'K-소스/조미료',
    category: '소스 & 양념',
    price: 19000,
    original_price: 24000,
    stock: 180,
    rating: 4.9,
    reviews_count: 98,
    sku: 'KFD-SAU-BULG-2K',
    format: '2kg 업소용 용기',
    finish: '나주배 농축 숙성 양조간장',
    color: '진한 앰버 갈색 소스',
    look: '윤기 흐르는 특제 마리네이드',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    description: '나주 배 즙과 특제 양조간장, 국산 다진 마늘을 숙성시켜 깊은 풍미를 자랑하는 업소용/B2B 불고기 비법 소스.',
    thickness: '2 kg',
    origin: '대한민국 (Korea)',
    is_featured: true,
    is_todays_deal: true,
    is_best_seller: false,
    deal_discount_percent: 20,

    // Domestic Specs
    brand: '송영민푸드 (Song Youngmin Food)',
    manufacturer: '송영민푸드 (주)',
    country_of_origin: '대한민국',
    net_weight: '2,000g',
    package_size: '140 x 140 x 280 mm',
    shelf_life: '18개월 (실온 보관)',
    storage: '직사광선을 피한 건냉소 보관 (개봉 후 냉장)',
    ingredients: '양조간장 35%(대두, 밀:국내산), 배농축액 15%(국내산), 설탕, 마늘, 참기름, 향신료, 정제수',
    allergens: '대두, 밀 함유',
    certifications: ['HACCP', 'Halal', 'Vegan', 'ISO', 'Gluten Free'],

    // Export Specs
    carton_qty: 6,
    carton_size: '440 x 300 x 300 mm',
    gross_weight: 13.2,
    cbm: 0.039,
    moq_cartons: 30,
    hs_code: '2103.90-9000',
    production_lead_time: '7 Days',
    export_packaging: 'Heavy-Duty HDPE Jug in Master CTN',
    loading_port: 'Busan / Incheon Port',
    export_price_usd: 14.80,
    wholesale_price_krw: 16150, // 15% discount off 19,000 KRW
    target_markets: ['USA', 'Japan', 'Middle East', 'Europe', 'China', 'Southeast Asia']
  },
  {
    id: 'prod-2',
    name: '원소주 프리미엄 증류식 소주 24% (WON SOJU Distilled Spirits)',
    name_en: 'WON SOJU Artisanal Distilled Rice Spirits 24% 375ml',
    collection: 'K-주류 & 전통주',
    category: '증류식 소주',
    price: 28000,
    original_price: 35000,
    stock: 80,
    rating: 5.0,
    reviews_count: 124,
    sku: 'KLQ-WON-SOJU-375',
    format: '375ml 유리병',
    finish: '100% 국내산 쌀 증류',
    color: '투명하고 감미로운 쌀 향',
    look: '옹기 장기 숙성 전통 증류주',
    image_url: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=800&q=80',
    description: '100% 국내산 쌀만을 발효하여 옹기 숙성한 부드럽고 깔끔한 풍미의 박재범 원소주 24% 전통 증류주.',
    thickness: '375 ml',
    origin: '원주, 대한민국',
    is_featured: true,
    is_todays_deal: false,
    is_best_seller: true,

    // Domestic Specs
    brand: '원스피리츠 (WON SPIRITS)',
    manufacturer: '원스피리츠 주식회사',
    country_of_origin: '대한민국',
    net_weight: '375ml',
    package_size: '70 x 70 x 240 mm',
    shelf_life: '유통기한 없음 (음용에 적합한 주류)',
    storage: '직사광선을 피하고 서늘한 곳 보관',
    ingredients: '쌀 100%(국내산 원주 쌀), 누룩, 효모, 정제수',
    allergens: '없음',
    certifications: ['HACCP', 'ISO'],

    // Export Specs
    carton_qty: 20,
    carton_size: '380 x 310 x 260 mm',
    gross_weight: 15.0,
    cbm: 0.030,
    moq_cartons: 50,
    hs_code: '2208.90-4000',
    production_lead_time: '10 Days',
    export_packaging: 'Heavy Divider Safety Glass Bottle CTN',
    loading_port: 'Incheon / Busan Port',
    export_price_usd: 21.00,
    wholesale_price_krw: 23800, // 15% discount off 28,000 KRW
    target_markets: ['USA', 'Japan', 'Europe', 'Southeast Asia']
  },
  {
    id: 'prod-4',
    name: '느린마을 수제 생막걸리 750ml (Slow Village Raw Rice Wine)',
    name_en: 'Slow Village Artisanal Fresh Raw Makgeolli 750ml',
    collection: 'K-주류 & 전통주',
    category: '막걸리 & 탁주',
    price: 14000,
    original_price: 16000,
    stock: 60,
    rating: 4.9,
    reviews_count: 72,
    sku: 'KLQ-SLOW-MAK-750',
    format: '750ml 신선 냉장병',
    finish: '무아스파탐 순수 발효',
    color: '뽀얀 우윳빛 발효주',
    look: '자연 탄산 살균 생막걸리',
    image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80',
    description: '인공 감미료 없이 쌀, 누룩, 물만으로 장기 순수 발효시킨 프레시 생막걸리. 부드러운 탄산과 순수한 단맛.',
    thickness: '750 ml',
    origin: '포천, 대한민국',
    is_featured: false,
    is_todays_deal: false,
    is_best_seller: false,

    // Domestic Specs
    brand: '배상면주가 (Baesangmyun Brewery)',
    manufacturer: '배상면주가 (주)',
    country_of_origin: '대한민국',
    net_weight: '750ml',
    package_size: '75 x 75 x 280 mm',
    shelf_life: '제조일로부터 30일 (0~4℃ 냉장)',
    storage: '0~4℃ 신선 냉장 보관',
    ingredients: '쌀 100%(국내산), 누룩, 효모, 정제수',
    allergens: '없음',
    certifications: ['HACCP'],

    // Export Specs
    carton_qty: 12,
    carton_size: '340 x 260 x 300 mm',
    gross_weight: 10.8,
    cbm: 0.026,
    moq_cartons: 40,
    hs_code: '2206.00-2010',
    production_lead_time: '7 Days',
    export_packaging: 'Chilled Air-Freight / Cold-Chain Reefer CTN',
    loading_port: 'Incheon Airport / Busan Port',
    export_price_usd: 9.80,
    wholesale_price_krw: 11900, // 15% discount off 14,000 KRW
    target_markets: ['Japan', 'USA', 'Southeast Asia']
  },
  {
    id: 'prod-snack',
    name: '송영민푸드 프리미엄 K-스낵 바삭 고구마칩 100g (Sweet Potato Chips)',
    name_en: 'Song Youngmin Premium Crunchy Sweet Potato Chips 100g',
    collection: 'K-스낵/음료',
    category: '과자 & 스낵',
    price: 6000,
    original_price: 8000,
    stock: 300,
    rating: 4.9,
    reviews_count: 56,
    sku: 'KFD-SNK-SWPOT-100',
    format: '100g 알루미늄 파우치',
    finish: '진공 저온 유탕 공법',
    color: '황금빛 자색 고구마색',
    look: '국산 100% 고구마 원물 스낵',
    image_url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80',
    description: '국산 고구마 100%를 진공 저온 공법으로 튀겨 고구마 본연의 달콤함과 바삭함을 살린 프리미엄 K-웰빙 스낵.',
    thickness: '100g',
    origin: '대한민국 (Korea)',
    is_featured: true,
    is_todays_deal: true,
    is_best_seller: true,
    deal_discount_percent: 25,

    // Domestic Specs
    brand: '송영민 K-Snack',
    manufacturer: '송영민푸드 (주)',
    country_of_origin: '대한민국',
    net_weight: '100g',
    package_size: '180 x 240 x 40 mm',
    shelf_life: '12개월 (실온 보관)',
    storage: '직사광선을 피한 서늘한 곳 보관',
    ingredients: '고구마 85%(국내산), 팜유, 올리고당, 해성 천일염',
    allergens: '없음 (HACCP/Halal/Vegan 인증)',
    certifications: ['HACCP', 'Halal', 'Vegan', 'Gluten Free'],

    // Export Specs
    carton_qty: 24,
    carton_size: '480 x 380 x 260 mm',
    gross_weight: 3.5,
    cbm: 0.047,
    moq_cartons: 50,
    hs_code: '2005.99-9000',
    production_lead_time: '7 Days',
    export_packaging: 'Nitrogen Flushed Foil Pouch in Heavy CTN',
    loading_port: 'Busan / Incheon Port',
    export_price_usd: 4.20,
    wholesale_price_krw: 5100, // 15% discount off 6,000 KRW
    target_markets: ['USA', 'Japan', 'Middle East', 'Europe', 'Southeast Asia']
  }
];

function ensureProductsFile(): ProductItem[] {
  if (!fs.existsSync(path.dirname(PRODUCTS_DATA_PATH))) {
    fs.mkdirSync(path.dirname(PRODUCTS_DATA_PATH), { recursive: true });
  }

  if (!fs.existsSync(PRODUCTS_DATA_PATH)) {
    saveProductsData(INITIAL_PRODUCTS);
    return INITIAL_PRODUCTS;
  }

  try {
    const fileData = fs.readFileSync(PRODUCTS_DATA_PATH, 'utf-8');
    const parsed = JSON.parse(fileData) as ProductItem[];
    if (!parsed || parsed.length === 0) {
      saveProductsData(INITIAL_PRODUCTS);
      return INITIAL_PRODUCTS;
    }
    return parsed;
  } catch (error) {
    console.error('Error reading products.json:', error);
    saveProductsData(INITIAL_PRODUCTS);
    return INITIAL_PRODUCTS;
  }
}

function saveProductsData(items: ProductItem[]) {
  if (!fs.existsSync(path.dirname(PRODUCTS_DATA_PATH))) {
    fs.mkdirSync(path.dirname(PRODUCTS_DATA_PATH), { recursive: true });
  }
  fs.writeFileSync(PRODUCTS_DATA_PATH, JSON.stringify(items, null, 2), 'utf-8');
}

/**
 * Get all products with optional attribute filter criteria
 */
export async function getProducts(filters?: {
  collection?: string;
  category?: string;
  format?: string[];
  finish?: string[];
  color?: string[];
  look?: string[];
  certification?: string[];
  targetMarket?: string[];
  search?: string;
}): Promise<ProductItem[]> {
  let products = ensureProductsFile();

  if (!filters) return products;

  if (filters.collection) {
    products = products.filter(
      (p) => p.collection.toLowerCase() === filters.collection?.toLowerCase()
    );
  }

  if (filters.category) {
    products = products.filter(
      (p) => p.category?.toLowerCase().includes(filters.category!.toLowerCase())
    );
  }

  if (filters.certification && filters.certification.length > 0) {
    products = products.filter((p) =>
      p.certifications?.some((c) => filters.certification?.includes(c))
    );
  }

  if (filters.targetMarket && filters.targetMarket.length > 0) {
    products = products.filter((p) =>
      p.target_markets?.some((m) => filters.targetMarket?.includes(m))
    );
  }

  if (filters.format && filters.format.length > 0) {
    products = products.filter((p) => filters.format?.includes(p.format));
  }

  if (filters.finish && filters.finish.length > 0) {
    products = products.filter((p) => filters.finish?.includes(p.finish));
  }

  if (filters.color && filters.color.length > 0) {
    products = products.filter((p) => filters.color?.includes(p.color));
  }

  if (filters.look && filters.look.length > 0) {
    products = products.filter((p) => filters.look?.includes(p.look));
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.name_en && p.name_en.toLowerCase().includes(q)) ||
        p.description.toLowerCase().includes(q) ||
        p.collection.toLowerCase().includes(q) ||
        (p.hs_code && p.hs_code.includes(q))
    );
  }

  return products;
}

/**
 * Get single product details by ID
 */
export async function getProductById(id: string): Promise<ProductItem | null> {
  const products = ensureProductsFile();
  return products.find((p) => p.id === id) || null;
}

/**
 * Create or update a product item
 */
export async function saveProduct(product: Partial<ProductItem> & { id?: string }): Promise<ProductItem> {
  const products = ensureProductsFile();

  if (product.id) {
    const idx = products.findIndex((p) => p.id === product.id);
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...product };
      saveProductsData(products);
      return products[idx];
    }
  }

  const newId = `prod-${Date.now()}`;
  const newProd: ProductItem = {
    id: newId,
    name: product.name || 'New Gourmet Ingredient',
    collection: product.collection || 'Artisanal Pantry',
    format: product.format || '500ml Bottle',
    finish: product.finish || 'Cold-Pressed',
    color: product.color || 'Emerald Gold',
    look: product.look || 'Italian Heritage',
    image_url: product.image_url || '',
    description: product.description || '',
    thickness: product.thickness || '9 mm',
    origin: product.origin || 'Italy',
    is_featured: product.is_featured ?? false,
  };

  products.unshift(newProd);
  saveProductsData(products);
  return newProd;
}

/**
 * Delete a product item
 */
export async function deleteProduct(id: string): Promise<boolean> {
  let products = ensureProductsFile();
  const initLen = products.length;
  products = products.filter((p) => p.id !== id);
  saveProductsData(products);
  return products.length < initLen;
}
