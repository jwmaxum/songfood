jest.mock('@/lib/operations/repository',()=>({snapshot:jest.fn()}));
import {GET} from '@/app/api/kpi/route';
import {snapshot} from '@/lib/operations/repository';
import {ApiError} from '@/lib/request-security';
beforeEach(()=>jest.clearAllMocks());
test('legacy KPI URL uses current role-scoped work service',async()=>{jest.mocked(snapshot).mockResolvedValue({total:12,items:[],counts:{unpaid:3}});const request=new Request('https://example.invalid/api/kpi'),r=await GET(request);expect(snapshot).toHaveBeenCalledWith(request,'work');expect(await r.json()).toMatchObject({total:12,counts:{unpaid:3}});expect(r.headers.get('cache-control')).toBe('no-store');});
test('storage failure is 503, never fake zero KPI',async()=>{jest.mocked(snapshot).mockRejectedValue(new Error('private database details'));const r=await GET(new Request('https://example.invalid/api/kpi')),b=await r.json();expect(r.status).toBe(503);expect(b).not.toHaveProperty('total');expect(JSON.stringify(b)).not.toContain('private database');});
test('denied KPI request remains denied',async()=>{jest.mocked(snapshot).mockRejectedValue(new ApiError(403,'권한 필요'));expect((await GET(new Request('https://example.invalid/api/kpi'))).status).toBe(403);});
