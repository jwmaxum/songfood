import {parseCommercialInquiry,inquiryFingerprint,InquiryValidationError} from '@/lib/commercial-inquiry';
import {parseReview,buildQuoteSnapshot,usdMinor} from '@/lib/crm/quote';
import type {CrmInquiry,ReviewInput} from '@/lib/crm/types';
import type {PriceRevision,ExchangeRate} from '@/lib/pricing/types';
import type {ProductItem} from '@/lib/types';
const payload={kind:'export_rfq',contact_name:'Buyer',email:'Buyer@example.com',country:'Japan',incoterms:'FOB',items:[{product_id:'p1',product_name:'Client name',quantity_cartons:3}]};
const inquiry={...parseCommercialInquiry(payload),id:'inquiry',status:'new',company_id:null,submitted_by:null,assigned_to:null,revision:1,created_at:'',updated_at:''} as CrmInquiry;
const review:ReviewInput={stock_status:'available',documents_status:'ready',lead_time_note:'Supplier confirmed 14 days',review_note:'FOB reviewed',change_reason:'Initial review',consultation_status:'not_required',consultation_note:'',adjustments:[]};
const price:PriceRevision={id:'price1',product_id:'p1',price_list_id:'list1',version:2,status:'approved',price_unit:'CTN',unit_price_krw:'110000',tax_code:'vat10',vat_included:true,ea_per_box:5,boxes_per_carton:2,ea_per_carton:10,minimum_order_unit:'CTN',minimum_order_quantity:1,export_moq_ctn:3,tiers:[],valid_from:'2026-10-01T00:00:00Z',valid_until:'2026-11-01T00:00:00Z',fob_status:'included',loading_port:'Busan',cost_review:'All FOB costs included',review_source:'Reviewed sheet',change_reason:'Reviewed',supersedes_id:null,created_by:'admin',created_at:'',approved_by:'admin',approved_at:''};
const rate:ExchangeRate={id:'rate1',krw_per_usd:'1250',source:'Fixture only',observed_at:'2026-10-01T00:00:00Z',valid_until:'2026-10-10T00:00:00Z',created_by:'admin',created_at:'',reason:'Fixture'};
const product={id:'p1',sku:'SKU1',name:'상품',name_en:'Server product'} as ProductItem;
const now=new Date('2026-10-03T00:00:00Z');
function snapshot(i=inquiry,r=review,p:PriceRevision|null=price,fx:ExchangeRate|null=rate){return buildQuoteSnapshot(i,r,[product],{p1:{price:p}},fx,now);}
test('optional company, requested port/date/documents and canonical email are accepted',()=>{
 expect(parseCommercialInquiry({...payload,requested_loading_port:'Busan',desired_ship_date:'2026-10-20',required_documents:['Spec','COA','Spec']})).toMatchObject({email:'buyer@example.com',requested_loading_port:'Busan',desired_ship_date:'2026-10-20',required_documents:['Spec','COA']});
});
test.each([
 [{...payload,email:'bad'},'email'],
 [{...payload,contact_name:''},'contact_name'],
 [{...payload,desired_ship_date:'2026-02-30'},'desired_ship_date'],
 [{...payload,required_documents:['x'.repeat(121)]},'required_documents'],
 [{...payload,items:[payload.items[0],payload.items[0]]},'items.1'],
 [{...payload,items:[{...payload.items[0],quantity_cartons:'3'}]},'items.0'],
 [{...payload,notes:'x'.repeat(10001)},'notes'],
])('field errors reject invalid submission %#',(body,key)=>{
 try{parseCommercialInquiry(body);throw new Error('expected validation');}catch(e){expect(e).toBeInstanceOf(InquiryValidationError);expect((e as InquiryValidationError).fields[key]).toBeDefined();}
});
test('fingerprint ignores untrusted product names and canonicalizes email and term',()=>{
 const a=parseCommercialInquiry(payload),b=parseCommercialInquiry({...payload,email:' buyer@example.com ',incoterms:'FOB Busan',items:[{...payload.items[0],product_name:'Renamed'}]});
 expect(inquiryFingerprint(a)).toBe(inquiryFingerprint(b));
});
test('snapshot pins authoritative price, tax, carton conversion, FX and FOB without adding costs',()=>{
 const q=snapshot();expect(q).toMatchObject({kind:'quotation_draft',currency:'USD',base_total_minor:24000,proposed_total_minor:24000,valid_until:rate.valid_until,issues:[]});
 expect(q.lines[0]).toMatchObject({name:'Server product',sku:'SKU1',quantity:3,price_source:price,base:{ea_per_unit:10,unit_net_minor:8000,tax_minor:0,loading_port:'Busan'}});
 expect(q.exchange_rate).toEqual(rate);expect(q.notice).toContain('not a Proforma Invoice');
});
test.each([null,{...price,status:'draft' as const},{...price,valid_until:'2026-10-02T00:00:00Z'},{...price,export_moq_ctn:4}])('unapproved, expired and below MOQ prices never invent a total %#',p=>{
 const q=snapshot(inquiry,review,p);expect(q.base_total_minor).toBeNull();expect(q.proposed_total_minor).toBeNull();expect(q.issues.length).toBeGreaterThan(0);
});
test('missing FX and products remain blocked with no total',()=>{
 expect(snapshot(inquiry,review,price,null).base_total_minor).toBeNull();
 expect(buildQuoteSnapshot(inquiry,review,[],{p1:{price}},rate,now).base_total_minor).toBeNull();
});
test('requested non-FOB, different port and unfinished reviews remain explicit blockers',()=>{
 const q=snapshot({...inquiry,incoterms:'CIF',requested_loading_port:'Incheon'},{...review,stock_status:'unavailable',documents_status:'missing',lead_time_note:''});
 expect(q.issues).toHaveLength(5);expect(q.incoterms).toBe('FOB');
});
test('adjustment keeps base immutable and separates proposal plus prior-discussion evidence',()=>{
 const r=parseReview({...review,adjustments:[{product_id:'p1',unit_net_usd:'82.50',reason:'Confirmed handling change'}],consultation_status:'agreed',consultation_note:'Buyer discussed by email 2026-10-03'});
 const q=snapshot(inquiry,r);expect(q.base_total_minor).toBe(24000);expect(q.proposed_total_minor).toBe(24750);expect(q.lines[0].base?.unit_net_minor).toBe(8000);expect(q.lines[0].price_source?.unit_price_krw).toBe('110000');
});
test('pending adjustment has a review blocker, and agreement requires evidence',()=>{
 const adj=[{product_id:'p1',unit_net_usd:'80.01',reason:'Proposed change'}];
 expect(snapshot(inquiry,{...review,adjustments:adj,consultation_status:'pending'}).issues).toContain('가격 조정 사전 협의 미완료');
 expect(()=>parseReview({...review,adjustments:adj})).toThrow(InquiryValidationError);
 expect(()=>parseReview({...review,adjustments:adj,consultation_status:'agreed',consultation_note:'yes'})).toThrow(InquiryValidationError);
});
test.each(['0','-1','1.001','1e3','NaN','999999999'])('invalid USD adjustment %s rejected',value=>expect(()=>usdMinor(value)).toThrow());
test('foreign or duplicate adjustments and domestic quote attempts are rejected',()=>{
 const a={product_id:'p1',unit_net_usd:'90',reason:'Review adjustment'};
 expect(()=>parseReview({...review,adjustments:[a,a],consultation_status:'pending'})).toThrow();
 expect(()=>snapshot(inquiry,{...review,adjustments:[{...a,product_id:'foreign'}]})).toThrow();
 expect(()=>snapshot({...inquiry,kind:'domestic_wholesale'})).toThrow();
});
