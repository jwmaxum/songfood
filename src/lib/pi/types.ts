import type {QuoteDraft} from '../crm/types';
export type Issuer={name:string;address:string;email:string;phone:string;payment_terms:string;bank_details:string};
export type IssueInput={seller:Issuer;buyer_address:string;valid_until:string;change_reason:string;fob_confirmed:boolean};
export type PiSnapshot={kind:'proforma_invoice';seller:Issuer;buyer:{name:string;contact:string;address:string;country:string;destination:string};
 currency:'USD';incoterms:'FOB';valid_until:string;lead_time:string;documents:string[];change_reason:string;notice:string;
 lines:{product_id:string;sku:string;name:string;quantity:number;ea_per_ctn:number;loading_port:string;unit_minor:number;total_minor:number}[];
 total_minor:number;source_valid_until:string;};
export type PiDocument={id:string;number:string;inquiry_id:string;quote_id:string;version:number;supersedes_id:string|null;snapshot:PiSnapshot;
 status:'preparing'|'issued'|'superseded'|'cancelled';created_at:string;issued_at:string|null;accepted_at:string|null;change_requested_at:string|null;
 pdf_path:string|null;pdf_sha256:string|null;pdf_bytes:number|null;created_by:string;request_key:string;request_hash:string;};
export type PublicPi=Pick<PiDocument,'id'|'number'|'inquiry_id'|'version'|'supersedes_id'|'snapshot'|'status'|'issued_at'|'accepted_at'|'change_requested_at'|'pdf_sha256'>;
export type PiPanelData={documents:PiDocument[];settings:{revision:number;data:Issuer}|null;events:{id:string;document_id:string;event:string;message:string;created_at:string}[];is_admin:boolean;quote?:QuoteDraft};
export const PI_NOTICE='PROFORMA INVOICE - Not a final Commercial Invoice. FOB includes domestic transport, export clearance and loading in the VAT-excluded wholesale price. Any price adjustment requires prior discussion and a revised Proforma Invoice; accepted terms are not changed unilaterally.';
export function piState(d:Pick<PiDocument,'status'|'accepted_at'|'change_requested_at'|'snapshot'>,now=Date.now()){
 if(d.status!=='issued')return d.status;
 if(d.accepted_at)return 'accepted';
 if(Date.parse(d.snapshot.valid_until)<=now)return 'expired';
 if(d.change_requested_at)return 'changes_requested';
 return 'issued';
}
