import {GET,PUT} from '@/app/api/admin/launch/route';
import {GET as health} from '@/app/api/health/route';
import {opsStaff} from '@/lib/operations/repository';
import {supabaseAdmin,isAuthConfigured} from '@/lib/supabase-admin';
import {serviceControls,assertTradeAvailable,parseServiceControls,launchStatus} from '@/lib/launch/repository';
import {launchChecks} from '@/lib/launch/readiness';
import {initialBusinessProfile} from '@/lib/business-settings';
import {ApiError} from '@/lib/request-security';
import {reportOperationalFailure} from '@/lib/operational-error';
import type {LaunchFacts,ServiceControls} from '@/lib/launch/types';
jest.mock('@/lib/operations/repository',()=>({opsStaff:jest.fn()}));
jest.mock('@/lib/business-settings-server',()=>({getBusinessSettings:jest.fn()}));
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{rpc:jest.fn(),from:jest.fn()},isAuthConfigured:jest.fn(()=>true)}));
const controls:ServiceControls={revision:1,inquiries_paused:false,orders_paused:false,pi_paused:false,owner:'',owner_id:null,response_minutes:null,updated_at:'2026-10-04T00:00:00Z'};
const state={inquiries_paused:false,orders_paused:false,pi_paused:false,owner_id:'00000000-0000-4000-8000-000000000101',response_minutes:30};
const facts:LaunchFacts={products:53,priced_products:0,exchange_ready:false,bank_ready:false,issuer_ready:false,private_pi_storage:true,notification_transport:'test_inbox',failed_notifications:0,preparing_pi:0,checked_at:controls.updated_at};
function chain(data:unknown,error:unknown=null){return {select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),order:jest.fn().mockReturnThis(),limit:jest.fn().mockResolvedValue({data,error}),maybeSingle:jest.fn().mockResolvedValue({data,error})};}
function req(body:unknown){return new Request('https://example.invalid/api/admin/launch',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}
beforeEach(()=>{jest.clearAllMocks();jest.mocked(opsStaff).mockResolvedValue({id:'admin',role:'admin',email:''});jest.mocked(supabaseAdmin.from).mockReturnValue(chain(controls) as never);jest.mocked(isAuthConfigured).mockReturnValue(true);});
test('unapproved prices, missing profiles and test document transport block launch readiness',()=>{
 const c=launchChecks(facts,controls,initialBusinessProfile);expect(c.filter(c=>!c.ready).map(c=>c.id)).toEqual(expect.arrayContaining(['business','prices','fx','bank','issuer','notification','owner']));
 expect(launchChecks({...facts,priced_products:1,exchange_ready:true,bank_ready:true},controls,initialBusinessProfile).find(c=>c.id==='notification')?.ready).toBe(false);
});
test.each([{revision:0},{revision:1.5},{reason:'x'},{state:{...state,orders_paused:'false'}},{state:{...state,secret:'x'}},{state:{...state,owner_id:'<script>'}},{state:{...state,response_minutes:2}},{state:{...state,response_minutes:5.5}},{state:{...state,response_minutes:'30'}}])('invalid controls rejected %j',patch=>{expect(()=>parseServiceControls({revision:1,state,reason:'장애 대응 설정',...patch})).toThrow(ApiError);});
test('strict valid state permits pause without requiring a newly invented business approval',()=>{expect(parseServiceControls({revision:1,state:{...state,owner_id:null,response_minutes:null},reason:'긴급 중지'}).state.owner_id).toBeNull();});
test('all new transaction types fail closed on pause and storage failure',async()=>{
 for(const kind of ['inquiries','orders','pi'] as const){jest.mocked(supabaseAdmin.from).mockReturnValue(chain({...controls,[kind+'_paused']:true}) as never);await expect(assertTradeAvailable(kind)).rejects.toMatchObject({status:503});}
 jest.mocked(supabaseAdmin.from).mockReturnValue(chain(null,{message:'private provider error'}) as never);await expect(serviceControls()).rejects.toMatchObject({status:503});await expect(assertTradeAvailable('orders')).rejects.toMatchObject({status:503});
});
test('anonymous and nonadmin cannot inspect or change launch settings',async()=>{
 jest.mocked(opsStaff).mockRejectedValue(new ApiError(403,'denied'));expect((await GET(new Request('https://example.invalid'))).status).toBe(403);expect((await PUT(req({revision:1,state,reason:'test'}))).status).toBe(403);expect(supabaseAdmin.from).not.toHaveBeenCalled();expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
test('admin mutations bind actor, reject stale state and remain no-store',async()=>{
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:{...controls,...state,revision:2},error:null} as never);
 const r=await PUT(req({revision:1,state,reason:'장애 대응 설정',actor_id:'spoofed'}));expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_save_service_controls',{p_actor:'admin',p_revision:1,p_state:state,p_reason:'장애 대응 설정'});
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({error:{code:'40001'}} as never);expect((await PUT(req({revision:1,state,reason:'장애 대응 설정'}))).status).toBe(409);
});
test('health discloses no configuration, user or database contents',async()=>{
 expect(await (await health()).json()).toEqual({status:'ok'});
 const log=jest.spyOn(console,'error').mockImplementation(()=>{});
 jest.mocked(supabaseAdmin.from).mockReturnValue(chain(null,{message:'secret-url@example.invalid'}) as never);
 const r=await health();expect(r.status).toBe(503);expect(await r.json()).toEqual({status:'unavailable'});expect(log.mock.calls.join(' ')).not.toContain('secret-url');log.mockRestore();
});
test('launch read failure is not substituted with empty ready facts',async()=>{
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:null,error:{code:'bad'}} as never);await expect(launchStatus('admin')).rejects.toBeDefined();
});
test('operational logs only fixed event/category/status, ignoring normal rejection',()=>{
 const log=jest.spyOn(console,'error').mockImplementation(()=>{});reportOperationalFailure('crm',400);expect(log).not.toHaveBeenCalled();reportOperationalFailure('pricing',503);expect(JSON.parse(log.mock.calls[0][0])).toEqual({event:'songfood_operation_failed',category:'pricing',status:503});log.mockRestore();
});
