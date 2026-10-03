/** @jest-environment jsdom */
import React from 'react';
import {fireEvent,render,screen,waitFor,cleanup} from '@testing-library/react';
import PricingManager from '@/app/admin/pricing/PricingManager';
jest.mock('@/app/admin/ExchangeRateWidget',()=>({__esModule:true,default:()=>null}));
afterEach(cleanup);
test('each product exposes a minimum unit and quantity editor and saves a draft',async()=>{
 const calls:Record<string,unknown>[]=[];
 const data={products:[{id:'p1',sku:'SKU1',name:'검증용 상품',wholesale_price_krw:1100,carton_qty:20,moq_cartons:3,loading_port:'Busan'}],
 lists:[{id:'00000000-0000-4000-8000-000000000201',name:'기본 가격표',scope:'common',active:true}],revisions:[],rates:[],canApprove:false,audit:[]};
 global.fetch=jest.fn(async(_url,options)=>{
  if(options?.method==='POST'){calls.push(JSON.parse(String(options.body)));return {ok:true,json:async()=>({success:true,data:[]})} as Response;}
  return {ok:true,json:async()=>data} as Response;
 });
 render(<PricingManager/>);
 fireEvent.click(await screen.findByRole('button',{name:'단위·가격 수정'}));
 fireEvent.change(screen.getByLabelText('최소구매단위 *'),{target:{value:'BOX'}});
 fireEvent.change(screen.getByLabelText('최소구매수량 *'),{target:{value:'2'}});
 fireEvent.click(screen.getByRole('button',{name:'새 가격 초안 저장'}));
 await waitFor(()=>expect(calls).toHaveLength(1));
 expect(calls[0]).toMatchObject({action:'draft',draft:{product_id:'p1',price_unit:'EA',unit_price_krw:'1100',minimum_order_unit:'BOX',minimum_order_quantity:2,tax_code:null}});
 expect(screen.queryByRole('button',{name:'검수 승인'})).toBeNull();
 await screen.findByText('저장되었습니다. 승인 전 초안은 고객 가격에 적용되지 않습니다.');
});
