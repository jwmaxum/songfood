import { assertApproved, customerInquiries, requireCustomer } from '@/lib/customer-auth';
import { sessionUser } from '@/lib/auth-session';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { CustomerSession } from '@/lib/b2b-types';
jest.mock('@/lib/auth-session',()=>({sessionUser:jest.fn()}));
jest.mock('@/lib/supabase-admin',()=>({isAuthConfigured:()=>true,supabaseAdmin:{from:jest.fn()}}));
const from = supabaseAdmin.from as jest.Mock;
const approved:CustomerSession = {user:{id:'u',name:'Buyer',email:'a@example.com'},
  company:{id:'company-a',name:'A',kind:'overseas',country:'US',registration_no:'a',status:'approved',created_at:''},
  membership:{company_id:'company-a',role:'member',status:'active'}};
test('pending, rejected, suspended companies and suspended members cannot transact',()=>{
  for(const status of ['pending','rejected','suspended'] as const)
    expect(()=>assertApproved({...approved,company:{...approved.company!,status}})).toThrow();
  expect(()=>assertApproved({...approved,membership:{...approved.membership!,status:'suspended'}})).toThrow();
  expect(()=>assertApproved({...approved,company:null,membership:null})).toThrow();
  expect(()=>assertApproved(approved,'company-b')).toThrow('자료를 찾을 수 없습니다.');
  expect(assertApproved(approved)).toBe('company-a');
});
function chain(data:unknown) {
  const q:Record<string,jest.Mock> = {};
  for(const name of ['select','eq','order','is','or','in']) q[name]=jest.fn(()=>q);
  q.maybeSingle=jest.fn(async()=>({data,error:null}));
  q.limit=jest.fn(async()=>({data,error:null}));
  return q;
}
beforeEach(()=>{
  jest.clearAllMocks();
  (sessionUser as jest.Mock).mockResolvedValue({id:'u',email:'a@example.com'});
});
test('another company inquiry ID is scoped to the authenticated company and returns 404',async()=>{
  const inquiries=chain([]);
  from.mockImplementation(table=>{
    if(table==='customer_accounts') return chain({name:'Buyer',status:'active'});
    if(table==='company_members') return chain(approved.membership);
    if(table==='companies') return chain(approved.company);
    return inquiries;
  });
  await expect(customerInquiries(new Request('https://shop.example'),'foreign-id')).rejects.toMatchObject({status:404});
  expect(inquiries.or).toHaveBeenCalledWith('company_id.eq.company-a,and(company_id.is.null,submitted_by.eq.u)');
  expect(inquiries.eq).toHaveBeenCalledWith('id','foreign-id');
});
test('disabled customer cannot read company or transaction data',async()=>{
  from.mockReturnValue(chain({name:'Buyer',status:'suspended'}));
  await expect(requireCustomer(new Request('https://shop.example'))).rejects.toMatchObject({status:403});
  expect(from).toHaveBeenCalledTimes(1);
});
test('expired customer cannot query tables',async()=>{
  (sessionUser as jest.Mock).mockResolvedValue(null);
  await expect(requireCustomer(new Request('https://shop.example'))).rejects.toMatchObject({status:401});
  expect(from).not.toHaveBeenCalled();
});

test('individual accesses only their own personal inquiries without a company',async()=>{
  const inquiries=chain([{id:'own-inquiry'}]);
  const activities=chain([{id:'public-reply',inquiry_id:'own-inquiry',message:'Public reply'}]);
  from.mockImplementation(table=>{
    if(table==='customer_accounts') return chain({name:'Buyer',status:'active'});
    if(table==='company_members') return chain(null);
    if(table==='b2b_inquiry_activities')return activities;
    return inquiries;
  });
  await expect(customerInquiries(new Request('https://shop.example'))).resolves.toEqual([{id:'own-inquiry',activities:[{id:'public-reply',inquiry_id:'own-inquiry',message:'Public reply'}]}]);
  expect(activities.eq).toHaveBeenCalledWith('visibility','customer');
  expect(activities.in).toHaveBeenCalledWith('inquiry_id',['own-inquiry']);
  expect(activities.select).toHaveBeenCalledWith('inquiry_id,id,event,message,created_at');
  expect(inquiries.is).toHaveBeenCalledWith('company_id',null);
  expect(inquiries.eq).toHaveBeenCalledWith('submitted_by','u');
  expect(inquiries.or).not.toHaveBeenCalled();
});
test('suspended company does not expose shared records or block own personal history',async()=>{
  const inquiries=chain([]);
  from.mockImplementation(table=>{
    if(table==='customer_accounts') return chain({name:'Buyer',status:'active'});
    if(table==='company_members') return chain(approved.membership);
    if(table==='companies') return chain({...approved.company,status:'suspended'});
    return inquiries;
  });
  await expect(customerInquiries(new Request('https://shop.example'),'foreign-id')).rejects.toMatchObject({status:404});
  expect(inquiries.is).toHaveBeenCalledWith('company_id',null);
  expect(inquiries.eq).toHaveBeenCalledWith('submitted_by','u');
  expect(inquiries.or).not.toHaveBeenCalled();
});
