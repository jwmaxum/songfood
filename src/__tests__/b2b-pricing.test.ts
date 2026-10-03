import { calculateLine, summarize } from '@/lib/pricing/engine';
import { parseDraft, readiness, unitsPerPackage } from '@/lib/pricing/validation';
import { previewCsv,readCsv } from '@/lib/pricing/csv';
import { selectPrice } from '@/lib/pricing/repository';
import type { PriceRevision,ExchangeRate,PriceList } from '@/lib/pricing/types';
import type { CustomerSession } from '@/lib/b2b-types';
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{from:jest.fn()}}));
const now=new Date('2026-09-29T00:00:00Z');
const base:PriceRevision={id:'price-1',product_id:'p1',price_list_id:'00000000-0000-4000-8000-000000000201',version:1,status:'approved',
 price_unit:'CTN',unit_price_krw:'110000',tax_code:'vat10',vat_included:true,ea_per_box:5,boxes_per_carton:2,ea_per_carton:10,
 minimum_order_unit:'EA',minimum_order_quantity:1,export_moq_ctn:1,tiers:[],valid_from:'2026-09-28T00:00:00Z',valid_until:'2026-10-01T00:00:00Z',
 fob_status:'included',loading_port:'Busan',cost_review:'운송·수출통관·본선적재 포함 확인',review_source:'검수 문서',change_reason:'최초 검수',
 supersedes_id:null,created_by:'staff',created_at:'2026-09-28T00:00:00Z',approved_by:'admin',approved_at:'2026-09-28T00:00:00Z'};
const rate:ExchangeRate={id:'rate-1',krw_per_usd:'1250',source:'Test fixture',observed_at:'2026-09-28T00:00:00Z',valid_until:'2026-10-01T00:00:00Z',created_by:'admin',created_at:'2026-09-28T00:00:00Z',reason:'Test only'};
const request={product_id:'p1',unit:'CTN' as const,quantity:1};
test('110,000 VAT-inclusive becomes 100,000 net and 10,000 VAT',()=>{
 const line=calculateLine(base,request,'domestic',null,now);
 expect(line).toMatchObject({unit_net_minor:100000,unit_tax_minor:10000,total_minor:110000});
 expect(line.unit_net_minor).not.toBe(99000);
});
test('VAT-exclusive and exempt prices are not divided by 1.1 twice',()=>{
 expect(calculateLine({...base,unit_price_krw:'100000',vat_included:false},request,'domestic',null,now)).toMatchObject({net_minor:100000,tax_minor:10000,total_minor:110000});
 expect(calculateLine({...base,tax_code:'exempt'},request,'domestic',null,now)).toMatchObject({net_minor:110000,tax_minor:0,total_minor:110000});
});
test('FOB uses VAT-excluded base and exact KRW/USD direction, no extra cost addition',()=>{
 const line=calculateLine(base,{...request,quantity:10},'export',rate,now);
 expect(line).toMatchObject({currency:'USD',unit_total_minor:8000,total_minor:80000,tax_minor:0,loading_port:'Busan',exchange_rate_id:'rate-1'});
 expect(summarize([line],'export').notice).toContain('not a Proforma Invoice');
});
test('EA, BOX and CTN conversion is consistent',()=>{
 const ea=calculateLine(base,{...request,unit:'EA',quantity:10},'domestic',null,now);
 const box=calculateLine(base,{...request,unit:'BOX',quantity:2},'domestic',null,now);
 const ctn=calculateLine(base,request,'domestic',null,now);
 expect(ea.total_minor).toBe(ctn.total_minor);expect(box.total_minor).toBe(ctn.total_minor);
});
test('minimum BOX cannot be bypassed by the equivalent EA quantity',()=>{
 const product={...base,minimum_order_unit:'BOX' as const,minimum_order_quantity:2};
 expect(()=>calculateLine(product,{...request,unit:'EA',quantity:10},'domestic',null,now)).toThrow('최소 구매는 2 BOX');
 expect(()=>calculateLine(product,{...request,unit:'BOX',quantity:1},'domestic',null,now)).toThrow('최소 구매는 2 BOX');
 expect(calculateLine(product,request,'domestic',null,now).total_minor).toBe(110000);
});
test.each([0,-1,1.5,100001,NaN])('quantity %p rejected',quantity=>{
 expect(()=>calculateLine(base,{...request,quantity},'domestic',null,now)).toThrow();
});
test('missing package counts and conflicting packaging never get fallback quantities',()=>{
 expect(()=>unitsPerPackage({...base,ea_per_carton:null,boxes_per_carton:null},'CTN')).toThrow();
 expect(()=>parseDraft({...base,ea_per_carton:11})).toThrow('총입수가 다릅니다');
});
test('quantity tiers use EA count but keep price basis CTN',()=>{
 const p={...base,tiers:[{min_ea:20,unit_price_krw:'99000'}]};
 expect(calculateLine(p,{...request,quantity:2},'export',rate,now)).toMatchObject({unit_total_minor:7200,total_minor:14400});
 expect(calculateLine(p,request,'export',rate,now).unit_total_minor).toBe(8000);
});
test('mixed taxable and exempt lines sum without inventing a global VAT deduction',()=>{
 const vat=calculateLine(base,request,'domestic',null,now),exempt=calculateLine({...base,product_id:'p2',tax_code:'exempt'},{...request,product_id:'p2'},'domestic',null,now);
 expect(summarize([vat,exempt],'domestic')).toMatchObject({net_minor:210000,tax_minor:10000,total_minor:220000});
});
test('expired or future prices, no/expired rates, draft prices and unreviewed FOB fail closed',()=>{
 for(const p of [{...base,status:'draft' as const},{...base,valid_until:now.toISOString()},{...base,valid_from:'2026-10-02T00:00:00Z'}])
  expect(()=>calculateLine(p,request,'domestic',null,now)).toThrow();
 for(const fx of [null,{...rate,valid_until:now.toISOString()},{...rate,observed_at:'2026-10-02T00:00:00Z'}])
  expect(()=>calculateLine(base,request,'export',fx,now)).toThrow('환율');
 expect(()=>calculateLine({...base,fob_status:'adjustment_required'},request,'export',rate,now)).toThrow('FOB');
});
test('USD half-up rounding occurs per package, totals equal displayed unit times quantity',()=>{
 const line=calculateLine({...base,unit_price_krw:'110001'}, {...request,quantity:3},'export',{...rate,krw_per_usd:'1300.123456'},now);
 expect(line.total_minor).toBe(line.unit_total_minor*3);
 expect(Number.isInteger(line.total_minor)).toBe(true);
});
test('CSV quoted commas, CRLF, duplicate/unknown SKU and bad boolean are handled',()=>{
 expect(readCsv('sku,review_source\r\nSKU1,"document, page 2"\r\n')).toEqual([['sku','review_source'],['SKU1','document, page 2']]);
 const products=[{id:'p1',sku:'SKU1'}],list=base.price_list_id;
 expect(previewCsv('sku,minimum_order_unit,minimum_order_quantity\nSKU1,BOX,2',products,list)[0]).toMatchObject({errors:[],draft:{minimum_order_unit:'BOX',minimum_order_quantity:2}});
 expect(previewCsv('sku\nSKU1\nSKU1',products,list).every(r=>r.errors.length)).toBe(true);
 expect(previewCsv('sku\nUNKNOWN',products,list)[0].errors).toHaveLength(1);
 expect(previewCsv('sku,vat_included\nSKU1,yes',products,list)[0].errors).toHaveLength(1);
 expect(()=>readCsv('sku\n"unterminated')).toThrow();
});
test('incomplete drafts remain editable but not ready for approval',()=>{
 const p=parseDraft({...base,minimum_order_unit:null,vat_included:null,review_source:''});
 expect(readiness(p)).toEqual(expect.arrayContaining(['최소 구매 단위·수량','과세 구분·VAT 포함 여부','검수 근거']));
});
const personal:CustomerSession={user:{id:'u',email:'buyer@example.com',name:'Buyer'},company:null,membership:null};
const lists:PriceList[]=[{id:base.price_list_id,name:'Common',scope:'common',company_id:null,active:true},{id:'private',name:'Company A',scope:'company',company_id:'a',active:true}];
test('personal customer immediately gets common pricing without company approval',()=>{
 expect(selectPrice('p1',personal,lists,[base,{...base,id:'private-price',price_list_id:'private'}],now).id).toBe('price-1');
});
test('company contract prices stay scoped and outrank common prices',()=>{
 const member:CustomerSession={...personal,company:{id:'a',name:'A',kind:'domestic',country:'KR',registration_no:null,status:'approved',created_at:''},membership:{company_id:'a',role:'member',status:'active'}};
 const rows=[base,{...base,id:'private-price',price_list_id:'private'}];
 expect(selectPrice('p1',member,lists,rows,now).id).toBe('private-price');
 expect(selectPrice('p1',{...member,company:{...member.company!,id:'b'}},lists,rows,now).id).toBe('price-1');
});
test('expired latest approval does not resurrect an earlier price',()=>{
 const latest={...base,id:'expired',version:2,valid_until:'2026-09-28T23:00:00Z'};
 const selected=selectPrice('p1',personal,lists,[base,latest],now);
 expect(selected.id).toBe('expired');
 expect(()=>calculateLine(selected,request,'domestic',null,now)).toThrow('만료');
});
