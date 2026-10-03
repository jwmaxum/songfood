import {buildQuoteSnapshot} from '@/lib/crm/quote';
import {parseCommercialInquiry} from '@/lib/commercial-inquiry';
import {buildPiSnapshot,parseIssue} from '@/lib/pi/validation';
import type {PriceRevision,ExchangeRate} from '@/lib/pricing/types';
import type {CrmInquiry,QuoteDraft} from '@/lib/crm/types';
import type {ProductItem} from '@/lib/types';
export const now=new Date('2026-10-03T00:00:00Z');
export const price:PriceRevision={id:'00000000-0000-4000-8000-000000000501',product_id:'p1',price_list_id:'list1',version:2,status:'approved',price_unit:'CTN',unit_price_krw:'110000',tax_code:'vat10',vat_included:true,ea_per_box:5,boxes_per_carton:2,ea_per_carton:10,minimum_order_unit:'CTN',minimum_order_quantity:1,export_moq_ctn:3,tiers:[],valid_from:'2026-10-01T00:00:00Z',valid_until:'2026-10-08T00:00:00Z',fob_status:'included',loading_port:'Busan',cost_review:'All FOB costs included',review_source:'Test only',change_reason:'Test only',supersedes_id:null,created_by:'admin',created_at:'',approved_by:'admin',approved_at:''};
export const rate:ExchangeRate={id:'00000000-0000-4000-8000-000000000502',krw_per_usd:'1250',source:'Fixture only',observed_at:'2026-10-01T00:00:00Z',valid_until:'2026-10-08T00:00:00Z',created_by:'admin',created_at:'',reason:'Fixture'};
const inquiry={...parseCommercialInquiry({kind:'export_rfq',company:'TEST BUYER / 검증 구매자',contact_name:'Test Buyer',email:'fixture@example.invalid',country:'Japan',incoterms:'FOB',items:[{product_id:'p1',quantity_cartons:3}]}),id:'00000000-0000-4000-8000-000000000503',status:'new',company_id:null,submitted_by:null,assigned_to:null,revision:1,created_at:'',updated_at:''} as CrmInquiry;
export function quote():QuoteDraft{
 const snapshot=buildQuoteSnapshot(inquiry,{stock_status:'available',documents_status:'ready',lead_time_note:'TEST ONLY: 14 days after review / 검토 후 14일',review_note:'Private margin note - do not expose',change_reason:'Internal review',consultation_status:'not_required',consultation_note:'',adjustments:[]},[{id:'p1',sku:'TEST-001',name:'한글 냉동 식료품 검증 상품 / Korean frozen food'} as ProductItem],{p1:{price}},rate,now);
 return {id:'00000000-0000-4000-8000-000000000504',inquiry_id:inquiry.id,version:1,supersedes_id:null,snapshot,created_by:'admin',created_at:now.toISOString(),request_key:'key',request_hash:'hash'};
}
export const input={seller:{name:'송영민푸드 / SONGFOOD - TEST ONLY',address:'TEST ONLY - Seoul, Korea / 서울시 검증용 주소',email:'sample@example.invalid',phone:'TEST ONLY',payment_terms:'TEST ONLY - Payment terms must be confirmed before an actual issue.',bank_details:'TEST ONLY - No bank account. Do not remit funds.'},buyer_address:'TEST ONLY - Tokyo, Japan / 실제 거래 주소 아님',valid_until:'2026-10-05T00:00:00Z',change_reason:'TEST SAMPLE / 출력 검증용, 실제 발행 아님',fob_confirmed:true};
export function sample(){return {id:'00000000-0000-4000-8000-000000000505',number:'SAMPLE-NOT-ISSUED',version:1,created_at:now.toISOString(),snapshot:buildPiSnapshot(quote(),parseIssue(input),[price],rate,now)};}
