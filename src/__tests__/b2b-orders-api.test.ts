jest.mock('@/lib/orders/repository',()=>({customerActor:jest.fn(),orderStaff:jest.fn(),orderDetail:jest.fn(),orderList:jest.fn(),submitOrder:jest.fn(),orderError:jest.fn()}));
jest.mock('@/lib/request-security',()=>{const a=jest.requireActual('@/lib/request-security');return {...a,rateLimit:jest.fn(),digest:jest.fn().mockResolvedValue('a'.repeat(64))};});
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{rpc:jest.fn()}}));
import {GET,POST} from '@/app/api/orders/route';
import {GET as detailGET,POST as detailPOST} from '@/app/api/orders/[id]/route';
import {POST as staffPOST} from '@/app/api/admin/orders/[id]/route';
import {customerActor,orderStaff,orderDetail,submitOrder} from '@/lib/orders/repository';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {ApiError} from '@/lib/request-security';
import {orderInput,oid,uid} from './fixtures/orders';
const context={params:Promise.resolve({id:oid})};
const request=(body:object)=>new Request('https://example.invalid/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>jest.clearAllMocks());
test('unauthenticated list stops before database access',async()=>{
 jest.mocked(customerActor).mockRejectedValue(new ApiError(401,'로그인 필요'));
 expect((await GET(new Request('https://example.invalid/api/orders'))).status).toBe(401);expect(orderDetail).not.toHaveBeenCalled();
});
test('unauthorized detail never loads order',async()=>{
 jest.mocked(customerActor).mockRejectedValue(new ApiError(403,'이용 중지'));
 expect((await detailGET(new Request('https://example.invalid'),context)).status).toBe(403);expect(orderDetail).not.toHaveBeenCalled();
});
test('submission validates request, rate limits and takes session identity',async()=>{
 jest.mocked(customerActor).mockResolvedValue({user:{id:uid,name:'User',email:'x@example.invalid'},company:null,membership:null});
 jest.mocked(submitOrder).mockResolvedValue({id:oid,replayed:false});
 const r=await POST(request({...orderInput,actor_id:'attacker',status:'paid'}));expect(r.status).toBe(201);
 expect(submitOrder).toHaveBeenCalledWith(expect.objectContaining({user:expect.objectContaining({id:uid})}),expect.not.objectContaining({status:'paid'}));
});
test('customer cannot call staff payment action',async()=>{
 jest.mocked(customerActor).mockResolvedValue({user:{id:uid,name:'User',email:''},company:null,membership:null});
 const r=await detailPOST(request({action:'deposit',request_key:oid,revision:1}),context);
 expect(r.status).toBe(403);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
test('wrong staff role stops mutation',async()=>{
 jest.mocked(orderStaff).mockRejectedValue(new ApiError(403,'주문 담당자 필요'));
 expect((await staffPOST(request({action:'deposit'}),context)).status).toBe(403);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
test('staff RPC uses authenticated actor and server hash',async()=>{
 jest.mocked(orderStaff).mockResolvedValue({id:uid,email:'staff@example.invalid',role:'order_staff'});
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:oid,error:null} as never);jest.mocked(orderDetail).mockResolvedValue({} as never);
 const r=await staffPOST(request({action:'deposit',request_key:oid,revision:3,amount_minor:100,reference:'Bank-123',occurred_at:'2026-01-01T00:00:00Z',message:'은행 내역 대조',actor_id:'attacker'}),context);
 expect(r.status).toBe(200);expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_order_action',expect.objectContaining({p_actor:uid,p_staff:true,p_data:expect.objectContaining({reference:'bank-123',amount_minor:100})}));
});
