export type TradeUnit = 'EA' | 'BOX' | 'CTN';
export type PriceScope = 'common' | 'personal' | 'business' | 'company';
export type PriceList = { id: string; name: string; scope: PriceScope; company_id: string | null; active: boolean };
export type PriceTier = { min_ea: number; unit_price_krw: string };
export type PriceDraft = {
  product_id: string; price_list_id: string; price_unit: TradeUnit | null;
  unit_price_krw: string | null; tax_code: 'vat10' | 'exempt' | null; vat_included: boolean | null;
  ea_per_box: number | null; boxes_per_carton: number | null; ea_per_carton: number | null;
  minimum_order_unit: TradeUnit | null; minimum_order_quantity: number | null; export_moq_ctn: number | null; tiers: PriceTier[];
  valid_from: string | null; valid_until: string | null;
  fob_status: 'unreviewed' | 'included' | 'adjustment_required'; loading_port: string;
  cost_review: string; review_source: string; change_reason: string; supersedes_id: string | null;
};
export type PriceRevision = PriceDraft & {
  id: string; version: number; status: 'draft' | 'approved' | 'rejected';
  created_by: string; created_at: string; approved_by: string | null; approved_at: string | null;
};
export type ExchangeRate = { id: string; krw_per_usd: string; source: string; observed_at: string;
  valid_until: string; created_by: string; created_at: string; reason: string };
export type PriceRequest = { product_id: string; unit: TradeUnit; quantity: number };
export type PriceLine = PriceRequest & {
  tax_code: 'vat10' | 'exempt'; currency: 'KRW' | 'USD'; unit_net_minor: number; unit_tax_minor: number; unit_total_minor: number;
  net_minor: number; tax_minor: number; total_minor: number; ea_per_unit: number;
  price_version_id: string; price_version: number; exchange_rate_id: string | null;
  valid_until: string; loading_port: string | null;
};
export type Preview = { kind: 'price_preview'; market: 'domestic' | 'export'; currency: 'KRW' | 'USD';
  lines: PriceLine[]; net_minor: number; tax_minor: number; total_minor: number; notice: string };
export type CatalogueEntry = { product_id: string; units: Partial<Record<TradeUnit, { quantity: number; line: PriceLine }>>;
  message: string; export_moq_ctn?: number; loading_port?: string; minimum_order?: { unit: TradeUnit; quantity: number } };
export const FOB_NOTICE = 'FOB includes domestic transport, export clearance and loading in the VAT-excluded wholesale price. Prices may change after prior discussion. This preview is not a Proforma Invoice or a final Commercial Invoice.';
export const UNIT_LABELS: Record<TradeUnit,string> = { EA:'낱개 (EA)', BOX:'박스 (BOX)', CTN:'카톤 (CTN)' };
export function formatMoney(minor: number, currency: 'KRW' | 'USD') {
  return new Intl.NumberFormat('ko-KR',{style:'currency',currency,minimumFractionDigits:currency==='USD'?2:0}).format(currency==='USD'?minor/100:minor);
}
