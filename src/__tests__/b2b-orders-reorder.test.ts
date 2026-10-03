jest.mock('@/lib/orders/repository',()=>({customerActor:jest.fn(),orderDetail:jest.fn()}));
jest.mock('@/lib/pricing/repository',()=>({...jest.requireActual('@/lib/pricing/repository'),quote:jest.fn()}));
jest.mock('@/lib/products-db',()=>({getProducts:jest.fn()}));
import {GET} from '@/app/api/orders/[id]/reorder/route';
import {customerActor,orderDetail as load} from '@/lib/orders/repository';
import {quote} from '@/lib/pricing/repository';
import {getProducts} from '@/lib/products-db';
import {PricingError} from '@/lib/pricing/validation';
import {ApiError} from '@/lib/request-security';
import {orderDetail,oid,uid} from './fixtures/orders';
const ctx={params:Promise.resolve({id:oid})};
beforeEach(()=>jest.clearAllMocks());
test('reorder asks current pricing for original quantities without copying old prices or stock',async()=>{
 jest.mocked(customerActor).mockResolvedValue({user:{id:uid,email:'test@example.invalid',name:'Buyer'},company:null,membership:null});
 jest.mocked(load).mockResolvedValue(orderDetail());jest.mocked(quote).mockResolvedValue({total_minor:22000,lines:[]} as never);
 jest.mocked(getProducts).mockResolvedValue([{id:'food',name:'Current product',stock:999,price:999}] as never);
 const r=await GET(new Request('https://example.invalid'),ctx),body=await r.json();
 expect(r.status).toBe(200);expect(body.preview.total_minor).toBe(22000);expect(body.items[0].product).not.toHaveProperty('price');expect(body.items[0].product).not.toHaveProperty('stock');
 expect(quote).toHaveBeenCalledWith(expect.objectContaining({user:expect.objectContaining({id:uid})}),[{product_id:'food',unit:'EA',quantity:10}],'domestic');
});
test('current MOQ or expired price prevents silent reorder',async()=>{
 jest.mocked(customerActor).mockResolvedValue({user:{id:uid,email:'',name:''},company:null,membership:null});jest.mocked(load).mockResolvedValue(orderDetail());
 jest.mocked(quote).mockRejectedValue(new PricingError('MOQ','현재 최소수량 확인'));jest.mocked(getProducts).mockResolvedValue([]);
 const r=await GET(new Request('https://example.invalid'),ctx);expect(r.status).toBe(422);expect((await r.json()).error).toBe('현재 최소수량 확인');
});
test('foreign order fails before price lookup',async()=>{
 jest.mocked(customerActor).mockResolvedValue({user:{id:uid,email:'',name:''},company:null,membership:null});jest.mocked(load).mockRejectedValue(new ApiError(404,'주문 없음'));
 expect((await GET(new Request('https://example.invalid'),ctx)).status).toBe(404);expect(quote).not.toHaveBeenCalled();
});
