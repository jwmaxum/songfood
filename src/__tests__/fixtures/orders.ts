import type {OrderInput,OrderDetail} from '@/lib/orders/types';
export const oid='10000000-0000-4000-8000-000000000001',uid='10000000-0000-4000-8000-000000000002',pid='10000000-0000-4000-8000-000000000003';
export const orderInput:OrderInput={request_key:oid,items:[{product_id:'food',unit:'EA',quantity:10}],expected_prices:[{product_id:'food',unit:'EA',quantity:10,price_version_id:pid,unit_total_minor:1100,total_minor:11000}],
 delivery:{recipient:'회원',phone:'010-0000-0000',postal_code:'12345',address:'서울시 테스트로',address_detail:'101호',desired_date:'',temperature:'product_standard',note:''},
 evidence_request:{kind:'none',company:'',registration_no:'',email:'',note:''}};
export function orderDetail():OrderDetail{
 return {order:{id:oid,number:'SF-TEST-0001',submitted_by:uid,company_id:null,revision:3,status:'confirmed',customer:{name:'회원',email:'buyer@example.invalid',company:''},
 delivery:orderInput.delivery,evidence_request:orderInput.evidence_request,net_minor:10000,tax_minor:1000,goods_total_minor:11000,shipping_net_minor:1000,shipping_tax_minor:100,total_minor:12100,paid_minor:6000,refunded_minor:0,credit_minor:0,claim_status:'none',
 review:{note:'공급 확인 완료',ship_date:'2026-10-10',temperature:'ambient',bank:{bank:'테스트 은행',account:'TEST-ACCOUNT',holder:'테스트',notice:''}},
 accepted_at:'2026-10-03T00:00:00Z',created_at:'2026-10-03T00:00:00Z',updated_at:'2026-10-03T00:00:00Z'},
 items:[{id:pid,position:0,shipped_quantity:0,cancelled_quantity:0,snapshot:{...orderInput.items[0],name:'테스트 식료품',sku:'TEST',storage:'상온',currency:'KRW',tax_code:'vat10',ea_per_unit:1,unit_net_minor:1000,unit_tax_minor:100,unit_total_minor:1100,net_minor:10000,tax_minor:1000,total_minor:11000,price_version_id:pid,price_version:1,valid_until:'2099-01-01T00:00:00Z',exchange_rate_id:null,loading_port:null}}],
 payments:[{id:uid,kind:'deposit',amount_minor:6000,occurred_at:'2026-10-03T01:00:00Z',created_at:'2026-10-03T01:00:00Z',reference:'PRIVATE-REFERENCE',evidence:'PRIVATE-EVIDENCE'}],shipments:[],events:[{id:uid,action:'submit',message:'주문이 접수되었습니다.',created_at:'2026-10-03T00:00:00Z'}]};
}
