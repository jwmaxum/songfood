export type InquiryKind = 'export_rfq' | 'domestic_wholesale';
export type InquiryStatus = 'new' | 'reviewing' | 'responded' | 'closed';
export const INQUIRY_STATUSES: InquiryStatus[] = ['new', 'reviewing', 'responded', 'closed'];

type Submission = Record<string, unknown>;
type InquiryItem = { product_id: string; product_name: string; quantity_cartons: number };

function field(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function parseCommercialInquiry(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('문의 내용을 확인해 주세요.');
  const body = input as Submission;
  const kind = body.kind;
  if (kind !== 'export_rfq' && kind !== 'domestic_wholesale') throw new Error('문의 종류가 올바르지 않습니다.');
  const company = field(body.company, 200);
  const contact_name = field(body.contact_name, 120);
  const email = field(body.email, 254);
  const phone = field(body.phone, 50);
  if (!company || !contact_name || !/^\S+@\S+\.\S+$/.test(email) || (kind === 'domestic_wholesale' && !phone)) {
    throw new Error('상호명, 담당자, 이메일 및 필수 연락처를 확인해 주세요.');
  }
  const rawItems = Array.isArray(body.items) ? body.items : [];
  let items: InquiryItem[] = [];
  if (kind === 'export_rfq') {
    if (rawItems.length === 0 || rawItems.length > 100) throw new Error('문의할 상품을 선택해 주세요.');
    items = rawItems.map((item) => {
      if (!item || typeof item !== 'object') throw new Error('상품 수량을 확인해 주세요.');
      const entry = item as Submission;
      const quantity = Number(entry.quantity_cartons);
      const product_id = field(entry.product_id, 100);
      const product_name = field(entry.product_name, 200);
      if (!product_id || !product_name || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000) throw new Error('상품 수량을 확인해 주세요.');
      return { product_id, product_name, quantity_cartons: quantity };
    });
  }
  const country = field(body.country, 100);
  const incoterms = field(body.incoterms, 30);
  if (kind === 'export_rfq' && (!country || !['FOB Busan', 'CIF', 'CFR', 'EXW'].includes(incoterms))) {
    throw new Error('목적지와 인도 조건을 확인해 주세요.');
  }
  return {
    kind, company, contact_name, email, phone: phone || null,
    business_type: field(body.business_type, 100) || null,
    business_registration_no: kind === 'domestic_wholesale' ? field(body.business_registration_no, 50) || null : null,
    country: kind === 'export_rfq' ? country : null,
    destination_port: kind === 'export_rfq' ? field(body.destination_port, 120) || null : null,
    incoterms: kind === 'export_rfq' ? incoterms : null,
    estimated_monthly_volume: kind === 'domestic_wholesale' ? field(body.estimated_monthly_volume, 100) || null : null,
    items, notes: field(body.notes, 10000) || null,
  };
}
