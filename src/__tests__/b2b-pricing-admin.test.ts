import { POST } from '@/app/api/admin/pricing/route';
import { getStaffIdentity } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { loadPricingData } from '@/lib/pricing/repository';
jest.mock('@/lib/admin-auth',()=>({getStaffIdentity:jest.fn()}));
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{from:jest.fn(),rpc:jest.fn()}}));
jest.mock('@/lib/pricing/repository',()=>({...jest.requireActual('@/lib/pricing/repository'),loadPricingData:jest.fn()}));
const req=(body:object)=>new Request('https://shop.example/api/admin/pricing',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{jest.clearAllMocks();(getStaffIdentity as jest.Mock).mockResolvedValue({id:'staff',role:'product_staff'});});
test('product staff can draft but cannot approve prices or exchange rates',async()=>{
 for(const action of ['approve','rate','create_list']) expect((await POST(req({action}))).status).toBe(403);
 expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
 (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({data:[],error:null});
 expect((await POST(req({action:'draft',draft:{product_id:'p1',price_list_id:'00000000-0000-4000-8000-000000000201',minimum_order_unit:'BOX',minimum_order_quantity:2}}))).status).toBe(200);
 expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_save_price_drafts',expect.objectContaining({p_actor:'staff',p_rows:[expect.objectContaining({minimum_order_unit:'BOX',minimum_order_quantity:2})]}));
});
test('other staff roles cannot create minimum purchase or pricing revisions',async()=>{
 (getStaffIdentity as jest.Mock).mockResolvedValue({id:'staff',role:'inquiry_staff'});
 expect((await POST(req({action:'draft'}))).status).toBe(403);
 expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
test('CSV import revalidates all rows and refuses the entire batch on an unknown SKU',async()=>{
 (supabaseAdmin.from as jest.Mock).mockReturnValue({select:()=>Promise.resolve({data:[{id:'p1',sku:'SKU1'}],error:null})});
 (loadPricingData as jest.Mock).mockResolvedValue({revisions:[]});
 const response=await POST(req({action:'import_csv',price_list_id:'00000000-0000-4000-8000-000000000201',csv:'sku,minimum_order_unit,minimum_order_quantity\nSKU1,BOX,2\nUNKNOWN,EA,1'}));
 expect(response.status).toBe(400);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
