export interface MenuItem {
  id: string;
  title: string;
  url: string;
  parent_id: string | null; // null for Depth 1, string ID for Depth 2
  sort_order: number;
  is_active: boolean;
  position: 'header' | 'footer' | 'both';
  image_url?: string;
  badge?: string;
  children?: MenuItem[];
}

export interface ReorderItemPayload {
  id: string;
  sort_order: number;
  parent_id?: string | null;
}

export interface HeroSlide {
  id: string;
  media_type: 'image' | 'video';
  media_url: string;
  poster_url?: string;
  title: string;
  subtitle: string;
  cta_label: string;
  cta_url: string;
  sort_order: number;
  is_active: boolean;
}

export interface ContentBlock {
  id: string;
  section_key: string; // e.g. "featured_categories", "brand_philosophy", "banner_alert"
  page: string; // e.g. "home", "about", "collections"
  title: string;
  subtitle: string;
  description: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  badge?: string;
  updated_at?: string;
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  size?: string;
  created_at: string;
}

export interface JournalArticle {
  id: string;
  title: string;
  slug: string;
  category: 'News' | 'Event' | 'Architecture' | 'Design' | '뉴스' | 'K-레시피' | string;
  content: string; // Markdown / Text content
  excerpt: string;
  cover_image: string;
  is_published: boolean;
  published_date: string;
}

export interface ProductItem {
  id: string;
  name: string;
  name_en?: string;
  collection: string;
  category?: string;
  price?: number;
  box_price?: number; // 박스(Box) 구매 판매 가격 (예: 36,000원)
  box_qty?: number; // 박스당 낱개 수 (예: 20개입)
  carton_price?: number; // 카톤(Carton) 구매 판매 가격 (예: 160,000원)
  carton_box_qty?: number; // 카톤당 박스 수 (예: 5박스 / 총 100개입)
  original_price?: number | null;
  stock?: number;
  rating?: number;
  reviews_count?: number;
  sku?: string;
  format: string;
  finish: string;
  color: string;
  look: string;
  image_url: string;
  images?: string[]; // 최대 6개 상품 이미지 갤러리 URL 배열
  description: string;
  thickness?: string;
  origin?: string;
  is_featured?: boolean;
  is_todays_deal?: boolean; // 오늘의 특가 지정 여부
  is_best_seller?: boolean; // 베스트셀러 지정 여부
  deal_discount_percent?: number; // 오늘의 특가 할인율 (%)
  
  // Domestic Product Specs
  brand?: string;
  manufacturer?: string;
  country_of_origin?: string;
  net_weight?: string;
  package_size?: string;
  shelf_life?: string;
  storage?: string;
  ingredients?: string;
  allergens?: string;
  certifications?: string[]; // e.g. ['HACCP', 'Halal', 'FSSC 22000', 'ISO', 'Vegan', 'Gluten Free']

  // Export Specs (Global B2B)
  carton_qty?: number; // Packets per Carton box
  carton_size?: string; // e.g. "450 x 320 x 240 mm"
  gross_weight?: number; // Gross weight per Carton in kg
  cbm?: number; // Volume per Carton in m^3
  moq_cartons?: number; // Minimum Order Quantity in Cartons
  hs_code?: string; // HS Code e.g. "1902.20"
  production_lead_time?: string; // e.g. "14 Days"
  export_packaging?: string; // e.g. "Reefer Cold Chain Box / Vacuum"
  loading_port?: string; // e.g. "Busan Port, Korea"
  export_price_usd?: number; // Export Price per CTN (USD)
  wholesale_price_krw?: number; // Domestic Wholesale Price (KRW)
  wholesale_discount_rate?: number; // Default 0.15 (15% discount)
  target_markets?: string[]; // e.g. ['USA', 'Japan', 'China', 'Southeast Asia', 'Middle East', 'Europe']
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
  selectedFormat?: string;
  selectedFinish?: string;
  purchaseType?: 'ea' | 'box' | 'carton' | 'retail' | 'wholesale'; // 'ea' 낱개 vs 'box' 박스 vs 'carton' 카톤
  packageLabel?: string; // e.g. "1개 (EA)", "1박스 (20개입)", "1카톤 (100개입 / 5박스)"
  unitPrice?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  addresses?: ShippingAddress[];
}

export interface ShippingAddress {
  id: string;
  title: string; // e.g. "Home", "Office"
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  format?: string;
  purchaseType?: 'retail' | 'wholesale';
}

export type SubAdminRole = 'ROLE_SUPER_ADMIN' | 'ROLE_CRM_BUYER' | 'ROLE_PRODUCT_MANAGER' | 'ROLE_ORDER_SHIPPING';

export interface Order {
  id: string;
  createdAt: string;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'PAID';
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  shippingAddress: ShippingAddress;
  paymentMethod: 'credit_card' | 'bank_transfer' | 'kakao_pay' | 'toss_payments';
  tossPaymentKey?: string;
  tossMethod?: string;
  carrier?: 'CJ대한통운' | '로젠택배' | '한진택배' | '우체국택배' | '롯데택배' | string;
  trackingNumber?: string;
  shippedAt?: string;
}

export interface RFQItem {
  productId: string;
  name: string;
  quantityCartons: number;
  unitPriceUsd: number;
  totalUsd: number;
  cbm: number;
  grossWeight: number;
  hsCode: string;
}

export interface RFQRequest {
  id: string;
  quoteNo: string; // e.g. "EXQ-2026-000123"
  company: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  destinationPort: string;
  incoterms: 'FOB Busan' | 'CIF' | 'CFR' | 'EXW';
  items: RFQItem[];
  subtotalUsd: number;
  packingFeeUsd: number;
  totalUsd: number;
  totalCbm: number;
  totalGrossWeight: number;
  reeferContainerFillPercent: number; // Utilization % of 20ft Reefer (28 CBM)
  notes?: string;
  status: 'NEW_LEAD' | 'INQUIRY' | 'PRODUCT_MATCHING' | 'QUOTATION' | 'NEGOTIATION' | 'PURCHASE_ORDER' | 'PAYMENT' | 'EXPORT';
  createdAt: string;
  businessType?: string;
}

export interface BuyerLead {
  id: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  status: RFQRequest['status'];
  totalQuotesCount: number;
  totalOrderValueUsd: number;
  lastInquiryDate: string;
  interestedProducts: string[];
}



