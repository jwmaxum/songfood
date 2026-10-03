import { POST } from '@/app/api/pricing/preview/route';
import { requireCustomer } from '@/lib/customer-auth';
import { quote } from '@/lib/pricing/repository';
import { rateLimit } from '@/lib/request-security';
jest.mock('@/lib/customer-auth',()=>({requireCustomer:jest.fn()}));
jest.mock('@/lib/request-security',()=>({...jest.requireActual('@/lib/request-security'),rateLimit:jest.fn()}));
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{from:jest.fn()},isAuthConfigured:()=>true}));
jest.mock('@/lib/pricing/repository',()=>({...jest.requireActual('@/lib/pricing/repository'),quote:jest.fn()}));
const req=(body:object)=>new Request('https://shop.example/api/pricing/preview',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{jest.clearAllMocks();(requireCustomer as jest.Mock).mockResolvedValue({user:{id:'personal'},company:null,membership:null});(rateLimit as jest.Mock).mockResolvedValue(undefined);});
test('browser price, rate and company overrides are rejected before calculation',async()=>{
 for(const extra of [{price:1},{exchangeRate:999999},{company_id:'other'}]){
  expect((await POST(req({market:'domestic',items:[{product_id:'p1',unit:'BOX',quantity:2,...extra}]}))).status).toBe(400);
 }
 expect(quote).not.toHaveBeenCalled();
});
test('personal quote uses authenticated identity and server-side pricing',async()=>{
 (quote as jest.Mock).mockResolvedValue({total_minor:110000});
 const response=await POST(req({market:'domestic',items:[{product_id:'p1',unit:'BOX',quantity:2}]}));
 expect(response.status).toBe(200);
 expect(quote).toHaveBeenCalledWith(expect.objectContaining({user:{id:'personal'},company:null}),[{product_id:'p1',unit:'BOX',quantity:2}],'domestic');
});
test('duplicate product/package lines cannot bypass per-line quantity rules',async()=>{
 const row={product_id:'p1',unit:'BOX',quantity:2};
 expect((await POST(req({market:'domestic',items:[row,row]}))).status).toBe(400);
 expect(quote).not.toHaveBeenCalled();
});
