import type { PriceDraft, PriceTier, TradeUnit } from './types';
export class PricingError extends Error {
  constructor(public code: string, message: string, public status = 422) { super(message); }
}
const UNITS = ['EA','BOX','CTN'];
export function amount(value: unknown, label = '금액') {
  const text = String(value ?? '').trim();
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(text) || Number(text) <= 0)
    throw new PricingError('INVALID_AMOUNT',label+'은 0보다 큰 금액(소수 2자리까지)으로 입력해 주세요.');
  return text;
}
export function positiveInteger(value: unknown, label: string, nullable = true): number | null {
  if (nullable && (value === null || value === undefined || value === '')) return null;
  if (!/^[0-9]+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value)<1 || Number(value)>1000000)
    throw new PricingError('INVALID_QUANTITY', label+'은 1~1,000,000 사이 정수여야 합니다.');
  return Number(value);
}
export function timestamp(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/T.*(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)))
    throw new PricingError('INVALID_DATE',label+'에 시간대가 포함된 날짜를 입력해 주세요.');
  return new Date(value).toISOString();
}
function text(value: unknown, max: number) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length>max) throw new PricingError('INVALID_TEXT','입력 길이를 확인해 주세요.');
  return value.trim();
}
export function parseDraft(value: unknown): PriceDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PricingError('INVALID_DRAFT','가격 정보를 확인해 주세요.');
  const b=value as Record<string,unknown>;
  const price_unit = b.price_unit === '' || b.price_unit == null ? null : b.price_unit;
  if (price_unit !== null && !UNITS.includes(String(price_unit))) throw new PricingError('INVALID_UNIT','가격 기준 단위를 확인해 주세요.');
  const tax_code = b.tax_code === '' || b.tax_code == null ? null : b.tax_code;
  if (tax_code!==null && !['vat10','exempt'].includes(String(tax_code))) throw new PricingError('INVALID_TAX','과세·면세 구분을 확인해 주세요.');
  const included=b.vat_included == null || b.vat_included === '' ? null : b.vat_included;
  if (included!==null && typeof included!=='boolean') throw new PricingError('INVALID_TAX','VAT 포함 여부를 확인해 주세요.');
  const tiers:PriceTier[]=[];
  if (b.tiers !== undefined && !Array.isArray(b.tiers)) throw new PricingError('INVALID_TIERS','수량구간 형식을 확인해 주세요.');
  for(const item of (b.tiers || []) as Record<string,unknown>[]) {
    if (!item || typeof item!=='object' || tiers.length>=20) throw new PricingError('INVALID_TIERS','수량구간은 최대 20개입니다.');
    const min=positiveInteger(item.min_ea,'수량구간',false)!;
    if (tiers.some(t=>t.min_ea===min)) throw new PricingError('DUPLICATE_TIER','중복 수량구간이 있습니다.');
    tiers.push({min_ea:min,unit_price_krw:amount(item.unit_price_krw)});
  }
  tiers.sort((a,b)=>a.min_ea-b.min_ea);
  const result:PriceDraft={
    product_id:text(b.product_id,100),price_list_id:text(b.price_list_id,36),price_unit:price_unit as TradeUnit|null,
    unit_price_krw:b.unit_price_krw == null || b.unit_price_krw === '' ? null : amount(b.unit_price_krw),
    tax_code:tax_code as PriceDraft['tax_code'],vat_included:included as boolean|null,
    ea_per_box:positiveInteger(b.ea_per_box,'BOX 입수'),boxes_per_carton:positiveInteger(b.boxes_per_carton,'CTN당 BOX'),
    ea_per_carton:positiveInteger(b.ea_per_carton,'CTN 입수'),minimum_order_unit:(b.minimum_order_unit || null) as TradeUnit|null,
    minimum_order_quantity:positiveInteger(b.minimum_order_quantity,'최소 구매 수량'),
    export_moq_ctn:positiveInteger(b.export_moq_ctn,'수출 최소 CTN'),tiers,
    valid_from:timestamp(b.valid_from,'적용 시작'),valid_until:timestamp(b.valid_until,'유효 종료'),
    fob_status:(b.fob_status || 'unreviewed') as PriceDraft['fob_status'],loading_port:text(b.loading_port,100),
    cost_review:text(b.cost_review,2000),review_source:text(b.review_source,1000),change_reason:text(b.change_reason,1000),
    supersedes_id:b.supersedes_id ? text(b.supersedes_id,36) : null,
  };
  if(result.minimum_order_unit && !UNITS.includes(result.minimum_order_unit)) throw new PricingError('INVALID_MINIMUM','최소 구매 단위를 확인해 주세요.');
  if (!result.product_id || !/^[0-9a-f-]{36}$/i.test(result.price_list_id)) throw new PricingError('INVALID_ID','상품과 가격표를 선택해 주세요.');
  if (!['unreviewed','included','adjustment_required'].includes(result.fob_status)) throw new PricingError('INVALID_FOB','FOB 비용 검토 상태를 확인해 주세요.');
  if (result.valid_from && result.valid_until && Date.parse(result.valid_from)>=Date.parse(result.valid_until))
    throw new PricingError('INVALID_PERIOD','종료일은 시작일 이후여야 합니다.');
  if (result.ea_per_box && result.boxes_per_carton && result.ea_per_box*result.boxes_per_carton>1000000)
    throw new PricingError('INVALID_PACK','카톤 총입수는 1,000,000 이하입니다.');
  if (result.ea_per_box && result.boxes_per_carton && result.ea_per_carton && result.ea_per_box*result.boxes_per_carton!==result.ea_per_carton)
    throw new PricingError('PACK_CONFLICT','BOX 입수 × CTN당 BOX 수와 CTN 총입수가 다릅니다.');
  return result;
}
export function unitsPerPackage(p: Pick<PriceDraft,'ea_per_box'|'boxes_per_carton'|'ea_per_carton'>, unit: TradeUnit) {
  if(unit==='EA') return 1;
  const value=unit==='BOX'?p.ea_per_box:p.ea_per_carton || (p.ea_per_box && p.boxes_per_carton ? p.ea_per_box*p.boxes_per_carton : null);
  if(!value) throw new PricingError('PACK_MISSING','검수된 '+unit+' 입수량이 없습니다. 견적 문의해 주세요.');
  return value;
}
export function readiness(p: PriceDraft, market: 'domestic'|'export' = 'domestic'): string[] {
  const issues:string[]=[];
  if(!p.price_unit || !p.unit_price_krw) issues.push('도매가·가격 기준 단위');
  if(!p.tax_code || p.vat_included===null) issues.push('과세 구분·VAT 포함 여부');
  if(!p.minimum_order_unit || !p.minimum_order_quantity) issues.push('최소 구매 단위·수량');
  if(p.minimum_order_unit) { try { unitsPerPackage(p,p.minimum_order_unit); } catch { issues.push('최소 구매 포장 입수'); } }
  if(!p.valid_from || !p.valid_until) issues.push('가격 적용기간');
  if(p.review_source.trim().length<3) issues.push('검수 근거');
  if(p.change_reason.trim().length<3) issues.push('등록·변경 사유');
  if(p.price_unit) { try { unitsPerPackage(p,p.price_unit); } catch { issues.push('기준 포장 입수'); } }
  if(market==='export') {
    try { unitsPerPackage(p,'CTN'); } catch { issues.push('CTN 입수'); }
    if(!p.export_moq_ctn) issues.push('수출 MOQ');
    if(p.fob_status!=='included' || p.cost_review.trim().length<3) issues.push('FOB 비용 포함 검토');
    if(p.loading_port.trim().length<2) issues.push('FOB 선적항');
  }
  return issues;
}
