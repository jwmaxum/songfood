jest.mock('@/lib/launch/repository',()=>({assertTradeAvailable:jest.fn()}));
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{rpc:jest.fn()}}));
jest.mock('@/lib/pricing/repository',()=>({quote:jest.fn()}));
jest.mock('@/lib/products-db',()=>({getProducts:jest.fn()}));
jest.mock('@/lib/request-security',()=>{const actual=jest.requireActual('@/lib/request-security');return {...actual,digest:jest.fn().mockResolvedValue('a'.repeat(64))};});
import {supabaseAdmin} from '@/lib/supabase-admin';
import {quote} from '@/lib/pricing/repository';
import {getProducts} from '@/lib/products-db';
import {submitOrder,priceSignature,orderError} from '@/lib/orders/repository';
import {orderInput,orderDetail,uid,oid} from './fixtures/orders';
import type {CustomerSession} from '@/lib/b2b-types';
const session:CustomerSession={user:{id:uid,name:'Test',email:'test@example.invalid'},company:null,membership:null};
beforeEach(()=>{jest.clearAllMocks();});
test('replay precedes current pricing so later expiry does not break retries',async()=>{
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:oid,error:null} as never);
 expect(await submitOrder(session,orderInput)).toEqual({id:oid,replayed:true});
 expect(quote).not.toHaveBeenCalled();
});
test('tampered or stale browser amount never persists an order',async()=>{
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:null,error:null} as never);
 const line=orderDetail().items[0].snapshot;jest.mocked(quote).mockResolvedValue({lines:[line]} as never);jest.mocked(getProducts).mockResolvedValue([{id:'food',name:'Server name'}] as never);
 await expect(submitOrder(session,{...orderInput,expected_prices:[{...orderInput.expected_prices[0],total_minor:1}]})).rejects.toMatchObject({status:409});
 expect(supabaseAdmin.rpc).toHaveBeenCalledTimes(1);
});
test('server-derived product metadata, price snapshot and identity are sent to RPC',async()=>{
 jest.mocked(supabaseAdmin.rpc).mockResolvedValueOnce({data:null,error:null} as never).mockResolvedValueOnce({data:oid,error:null} as never);
 jest.mocked(quote).mockResolvedValue({lines:[orderDetail().items[0].snapshot]} as never);jest.mocked(getProducts).mockResolvedValue([{id:'food',name:'Server name',sku:'SKU',storage:'냉동'}] as never);
 await submitOrder(session,orderInput);
 expect(supabaseAdmin.rpc).toHaveBeenLastCalledWith('b2b_order_submit',expect.objectContaining({p_actor:uid,p_company:null,p_lines:[expect.objectContaining({name:'Server name',storage:'냉동',total_minor:11000})]}));
});
test('unavailable products cannot be ordered',async()=>{
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:null,error:null} as never);jest.mocked(quote).mockResolvedValue({lines:[orderDetail().items[0].snapshot]} as never);jest.mocked(getProducts).mockResolvedValue([]);
 await expect(submitOrder(session,orderInput)).rejects.toMatchObject({status:422});
});
test('comparison ignores ordering but keeps price version, quantity and unit',()=>{
 const a=orderInput.expected_prices[0],b={...a,unit:'BOX' as const};expect(priceSignature([a,b])).toBe(priceSignature([b,a]));expect(priceSignature([a])).not.toBe(priceSignature([{...a,quantity:11}]));
});
test.each([['23505',409],['40001',409],['42501',403],['P0002',404],['22023',422],['unknown',503]])('DB %s mapped safely', (code,status)=>{
 try{orderError({code});throw Error('Expected failure');}catch(e){expect(e).toMatchObject({status});}
});
