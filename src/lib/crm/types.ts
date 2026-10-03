import type {ParsedInquiry,InquiryStatus} from '../commercial-inquiry';
import type {PriceLine,PriceRevision,ExchangeRate} from '../pricing/types';
export type CrmInquiry=ParsedInquiry & {id:string;status:InquiryStatus;company_id:string|null;submitted_by:string|null;assigned_to:string|null;revision:number;created_at:string;updated_at:string};
export type Activity={id:string;event:string;visibility:'internal'|'customer';message:string;details:Record<string,unknown>;created_at:string;actor_id:string|null};
export type ReviewInput={
 stock_status:'unreviewed'|'available'|'unavailable'; documents_status:'unreviewed'|'ready'|'missing';
 lead_time_note:string; review_note:string; change_reason:string;
 consultation_status:'not_required'|'pending'|'communicated'|'agreed'; consultation_note:string;
 adjustments:{product_id:string;unit_net_usd:string;reason:string}[];
};
export type QuoteSnapshot={
 kind:'quotation_draft'; inquiry_id:string; created_at:string; currency:'USD'; incoterms:'FOB';
 notice:string; buyer:{company:string;contact_name:string;country:string|null;destination_port:string|null;company_id:string|null;submitted_by:string|null};
 requested:{incoterms:string|null;loading_port:string|null;ship_date:string|null;documents:string[]};
 review:ReviewInput; issues:string[]; base_total_minor:number|null; proposed_total_minor:number|null;valid_until:string|null;
 exchange_rate:ExchangeRate|null;
 lines:{product_id:string;sku:string;name:string;quantity:number;price_source:PriceRevision|null;base:PriceLine|null;proposed_unit_minor:number|null;proposed_total_minor:number|null;adjustment_reason:string|null;issue:string|null}[];
};
export type QuoteDraft={id:string;inquiry_id:string;version:number;supersedes_id:string|null;snapshot:QuoteSnapshot;created_by:string;created_at:string;request_key:string;request_hash:string};
export type Notification={id:string;activity_id:string;channel:'test_inbox';status:'queued'|'failed'|'delivered';attempts:number;last_error:string|null;created_at:string;delivered_at:string|null};
export type CrmDetail={inquiry:CrmInquiry;activities:Activity[];quotes:QuoteDraft[];notifications:Notification[];attempts:{id:string;notification_id:string;attempt:number;result:string;message:string;created_at:string}[]};
