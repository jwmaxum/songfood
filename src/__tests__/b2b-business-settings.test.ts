import {validateBusinessSettings} from '@/lib/business-settings-server';
import {initialBusinessProfile,businessGaps} from '@/lib/business-settings';
import {GET,PUT} from '@/app/api/admin/business-settings/route';
import {opsStaff} from '@/lib/operations/repository';
import {getBusinessSettings} from '@/lib/business-settings-server';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {ApiError} from '@/lib/request-security';
jest.mock('@/lib/operations/repository',()=>({opsStaff:jest.fn()}));
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{rpc:jest.fn()},isAuthConfigured:()=>false}));
jest.mock('@/lib/business-settings-server',()=>({...jest.requireActual('@/lib/business-settings-server'),getBusinessSettings:jest.fn()}));
const valid=()=>({profile:{...initialBusinessProfile},revision:1,reason:'공개 정보 검토'});
beforeEach(()=>{jest.clearAllMocks();(opsStaff as jest.Mock).mockResolvedValue({id:'admin',role:'admin'});});
test('confirmed contacts only; unconfirmed owner, registration and policies remain empty',()=>{
 expect(initialBusinessProfile).toMatchObject({name:'송영민푸드',phone:'010-3889-3344',email:'3song876@daum.net',export_phone:'+82-10-2143-2120',owner:'',registration:'',address:''});
 expect(businessGaps(initialBusinessProfile)).toEqual(expect.arrayContaining(['owner','registration','address','privacy_ko','returns_en']));
 expect(validateBusinessSettings(valid()).profile).toEqual(initialBusinessProfile);
});
test.each([
 {profile:{...initialBusinessProfile,owner:'<script>alert(1)</script>'}},
 {profile:{...initialBusinessProfile,secret:'private'}},
 {profile:{...initialBusinessProfile,email:'bad'}},
 {profile:{...initialBusinessProfile,phone:'javascript:alert(1)'}},
 {profile:{...initialBusinessProfile,name:''}},
 {profile:{...initialBusinessProfile,address:'x'.repeat(501)}},
 {revision:0},{revision:1.5},{reason:'x'}
])('invalid settings rejected: %j',patch=>{expect(()=>validateBusinessSettings({...valid(),...patch})).toThrow(ApiError);});
test('admin-only read and mutation pass the actor to the RPC',async()=>{
 (getBusinessSettings as jest.Mock).mockResolvedValue({profile:initialBusinessProfile,revision:1});
 expect((await GET(new Request('http://localhost/api/admin/business-settings'))).status).toBe(200);
 const req=new Request('http://localhost/api/admin/business-settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(valid())});
 (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({data:{profile:initialBusinessProfile,revision:2},error:null});
 expect((await PUT(req)).status).toBe(200);expect(opsStaff).toHaveBeenCalledWith(req,['admin']);
 expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_save_business_settings',expect.objectContaining({p_actor:'admin',p_revision:1}));
});
test('denied users do not access storage and stale revision returns 409',async()=>{
 (opsStaff as jest.Mock).mockRejectedValueOnce(new ApiError(403,'forbidden'));
 expect((await GET(new Request('http://localhost'))).status).toBe(403);expect(getBusinessSettings).not.toHaveBeenCalled();
 (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({error:{code:'40001'}});
 const r=await PUT(new Request('http://localhost',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(valid())}));
 expect(r.status).toBe(409);expect((await r.json()).error).toContain('다른 관리자가');
});
