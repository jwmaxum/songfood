import {parseOrder,parseAction,bankSettings} from '@/lib/orders/validation';
import {orderInput,oid,pid,orderDetail} from './fixtures/orders';
import {payable,refundDue,trackingUrl,fulfillment} from '@/lib/orders/types';
const body=(action:string,extra:Record<string,unknown>={})=>({action,request_key:oid,revision:1,...extra});
describe('domestic order input',()=>{
 test('individual account needs neither company nor registration number',()=>{expect(parseOrder(orderInput).evidence_request.kind).toBe('none');});
 test.each([0,1.1,100001,-1])('rejects quantity %s',quantity=>expect(()=>parseOrder({...orderInput,items:[{...orderInput.items[0],quantity}]})).toThrow());
 test('same product in different packs allowed, duplicate pack rejected',()=>{
  expect(()=>parseOrder({...orderInput,items:[...orderInput.items,...orderInput.items]})).toThrow('중복');
  expect(()=>parseOrder({...orderInput,items:[...orderInput.items,{product_id:'food',unit:'BOX',quantity:1}],expected_prices:[...orderInput.expected_prices,{...orderInput.expected_prices[0],unit:'BOX',quantity:1}]})).not.toThrow();
 });
 test.each(['12','123456','abcde'])('rejects postal code %s',postal_code=>expect(()=>parseOrder({...orderInput,delivery:{...orderInput.delivery,postal_code}})).toThrow());
 test('rejects past or invalid desired date',()=>{
  for(const desired_date of ['2026-02-30','2000-01-01','tomorrow'])expect(()=>parseOrder({...orderInput,delivery:{...orderInput.delivery,desired_date}})).toThrow();
 });
 test('tax invoice fields required only when requested',()=>{
  expect(()=>parseOrder({...orderInput,evidence_request:{kind:'cash_receipt'}})).not.toThrow();
  expect(()=>parseOrder({...orderInput,evidence_request:{kind:'tax_invoice'}})).toThrow('요청할 때만');
 });
 test('price expectation is mandatory',()=>expect(()=>parseOrder({...orderInput,expected_prices:[]})).toThrow('가격'));
 test('client payment status and total are discarded',()=>{expect(parseOrder({...orderInput,status:'paid',total_minor:1})).not.toHaveProperty('status');});
});
describe('order mutations',()=>{
 test.each(['deposit','ship','refund','review','credit','resolve_claim'])('customer may not %s',action=>expect(()=>parseAction(body(action),false)).toThrow('허용되지'));
 test('staff cannot confirm terms in place of customer',()=>expect(()=>parseAction(body('accept'),true)).toThrow('허용되지'));
 test('accept contains no client-controlled amounts',()=>expect(parseAction(body('accept',{paid_minor:100000}),false).payload).toEqual({}));
 test('review requires supply acknowledgement',()=>expect(()=>parseAction(body('review'),true)).toThrow('공급'));
 test('shipping VAT is derived on the server instead of trusting browser amount',()=>{
  const result=parseAction(body('review',{supply_confirmed:true,shipping_net_minor:1005,shipping_tax_minor:99999,shipping_tax_code:'vat10',ship_date:'2099-01-01',temperature:'ambient',message:'배송비 근거 확인'}),true);
  expect(result.payload.shipping_tax_minor).toBe(101);
 });
 test('payment needs actual evidence and canonical bank reference',()=>{
  const result=parseAction(body('deposit',{amount_minor:100,occurred_at:'2026-01-01T00:00:00Z',reference:' BANK-123 ',message:'은행 대조 완료'}),true);
  expect(result.payload.reference).toBe('bank-123');
  expect(()=>parseAction(body('deposit',{...result.payload,occurred_at:'2099-01-01T00:00:00Z'}),true)).toThrow();
 });
 test('shipping accepts own identifiers only and rejects repeated item IDs',()=>{
  const b=body('ship',{carrier:'cj',temperature:'ambient',tracking:'1234567890',message:'포장 확인 완료',items:[{item_id:pid,quantity:1},{item_id:pid,quantity:2}]});
  expect(()=>parseAction(b,true)).toThrow('중복');
  expect(()=>parseAction({...b,items:[{item_id:pid,quantity:1}],tracking:'https://evil.invalid'},true)).toThrow('운송장');
 });
 test('bank placeholders are not generated',()=>expect(()=>bankSettings({})).toThrow());
 test('rejects credit without agreement',()=>expect(()=>parseAction(body('credit',{amount_minor:100,message:'반품 합의'}),true)).toThrow('합의'));
});
test('balances distinguish deposits, refunds and credits',()=>{
 const d=orderDetail(),o={...d.order,paid_minor:12100,credit_minor:6600,refunded_minor:6000};
 expect(payable(o)).toBe(5500);expect(refundDue(o)).toBe(600);
 expect(fulfillment([{...d.items[0],shipped_quantity:4,cancelled_quantity:6}])).toBe('출고/취소 수량 처리 완료');
});
test('tracking links cannot contain user supplied protocols or hostnames',()=>{
 expect(trackingUrl('direct','javascript:alert(1)')).toBeNull();
 expect(trackingUrl('cj','1234567890')).toMatch(/^https:\/\/trace.cjlogistics.com\//);
 expect(trackingUrl('cj','123<script>')).toBeNull();
});
