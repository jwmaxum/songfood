/** @jest-environment jsdom */
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
jest.mock('next/navigation',()=>({useRouter:()=>({push:pushMock}),usePathname:()=>'/admin'}));
import OperationsBoard from '@/components/operations/OperationsBoard';
import WorkPlan from '@/components/operations/WorkPlan';
import type {WorkRow} from '@/lib/operations/types';
const pushMock=jest.fn(),fetchMock=jest.fn(),id='11111111-1111-4111-8111-111111111111';
const data={role:'order_staff',as_of:'2026-10-04T00:00:00Z',counts:{unpaid:12},total:12,items:[],staff:[],page:1,page_size:30};
const response=(body:unknown,ok=true)=>({ok,json:async()=>body});
beforeEach(()=>{jest.clearAllMocks();global.fetch=fetchMock;fetchMock.mockResolvedValue(response(data));});
test('metric routes to same filtered list and role hides other domains',async()=>{
 render(<OperationsBoard mode="work" query="assigned=mine&q=Food"/>);
 fireEvent.click(await screen.findByRole('button',{name:/미입금 12/}));
 expect(pushMock).toHaveBeenCalledWith('/admin?assigned=mine&q=Food&category=unpaid&page=1');
 expect(screen.queryByRole('button',{name:/PI 발행 검토/})).not.toBeInTheDocument();
 expect(screen.queryByRole('link',{name:'감사 이력'})).not.toBeInTheDocument();
});
test('query failure is visibly unavailable and does not render zero cards',async()=>{
 fetchMock.mockResolvedValue(response({error:'연결 실패'},false));
 render(<OperationsBoard mode="work" query=""/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('조회 불가');
 expect(screen.queryByLabelText('업무 현황')).not.toBeInTheDocument();
});
test('work detail and full history links preserve exact order identity',async()=>{
 fetchMock.mockResolvedValue(response({...data,items:[{id,kind:'order',title:'SF-1',subtitle:'Buyer',tags:['unpaid'],status:'confirmed',revision:3,assigned_to:null,due_at:null,created_at:data.as_of}]}));
 render(<OperationsBoard mode="work" query=""/>);
 expect(await screen.findByRole('link',{name:'업무 상세 →'})).toHaveAttribute('href','/admin/orders?order='+id);
 expect(screen.getByRole('link',{name:'전체 업무 이력'})).toHaveAttribute('href','/admin/history/order/'+id);
});
test('handoff uses KST and idempotent retry excludes wrong-domain staff',async()=>{
 fetchMock.mockResolvedValueOnce(response({error:'일시 장애'},false)).mockResolvedValueOnce(response({success:true}));
 const row={id,kind:'order',title:'SF-1',subtitle:'',status:'confirmed',revision:3,assigned_to:null,assigned_name:null,due_at:null,created_at:data.as_of,tags:[]} as WorkRow,changed=jest.fn().mockResolvedValue(undefined);
 render(<WorkPlan row={row} staff={[{id,name:'Order staff',role:'order_staff'},{id:'other',name:'Inquiry staff',role:'inquiry_staff'}]} changed={changed}/>);
 expect(screen.queryByRole('option',{name:'Inquiry staff'})).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('마감일시 (한국 시간)'),{target:{value:'2026-10-04T15:00'}});
 fireEvent.change(screen.getByLabelText('인수인계 · 다음 행동'),{target:{value:'은행 확인 후 출고'}});
 const button=screen.getByRole('button',{name:'담당자·기한 저장'});fireEvent.submit(button.closest('form')!);
 await screen.findByText('일시 장애');fireEvent.submit(button.closest('form')!);await waitFor(()=>expect(changed).toHaveBeenCalled());
 const first=JSON.parse(fetchMock.mock.calls[0][1].body),second=JSON.parse(fetchMock.mock.calls[1][1].body);
 expect(first.due_at).toBe('2026-10-04T06:00:00.000Z');expect(first.request_key).toBe(second.request_key);expect(first.revision).toBe(3);
});
