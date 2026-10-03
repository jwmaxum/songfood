/** @jest-environment jsdom */
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
jest.mock('@/context/AuthContext',()=>({useAuth:jest.fn()}));
jest.mock('@/context/CartContext',()=>({useCart:jest.fn(),cartUnit:()=> 'EA'}));
jest.mock('next/navigation',()=>({useRouter:()=>({push:pushMock})}));
jest.mock('@/lib/orders/client',()=>({orderPost:jest.fn(),orderGet:jest.fn()}));
import {useAuth} from '@/context/AuthContext';
import {useCart} from '@/context/CartContext';
import {orderPost} from '@/lib/orders/client';
import Checkout from '@/components/orders/Checkout';
import {Details} from '@/components/orders/OrderWorkspace';
import OrderActions from '@/components/orders/OrderActions';
import {orderDetail,oid} from './fixtures/orders';
const pushMock=jest.fn(),clearMock=jest.fn();
beforeEach(()=>jest.clearAllMocks());
test('customer detail never renders internal bank proof',()=>{
 render(<Details staff={false} detail={orderDetail()}/>);
 expect(screen.queryByText(/PRIVATE-EVIDENCE/)).not.toBeInTheDocument();
 expect(screen.getByText(/입금 잔액.*6,100/)).toBeInTheDocument();
 expect(screen.getAllByText(/공급가액.*10,000.*VAT.*1,000/)).toHaveLength(2);
});
test('staff can review bank proof and partial deposit state',()=>{
 render(<Details staff detail={orderDetail()}/>);
 expect(screen.getByText(/PRIVATE-EVIDENCE/)).toBeInTheDocument();
});
test('unpaid shipping inputs are disabled; customer has no payment confirmation form',()=>{
 const d=orderDetail(),{unmount}=render(<OrderActions detail={d} staff busy={false} act={jest.fn()}/>);
 expect(screen.getByLabelText('운송장 / 화물 배송 참조번호')).toBeDisabled();
 unmount();render(<OrderActions detail={d} staff={false} busy={false} act={jest.fn()}/>);
 expect(screen.queryByText('은행 입금 확인 기록')).not.toBeInTheDocument();expect(screen.getAllByText('입금 확인 요청').length).toBeGreaterThan(0);
});
test('personal checkout posts server-revalidated quantities and opens persisted order',async()=>{
 jest.mocked(useAuth).mockReturnValue({loading:false,user:{name:'개인회원',email:'test@example.invalid'}} as never);
 jest.mocked(useCart).mockReturnValue({cartItems:[{product:{id:'food',name:'테스트 식료품'},quantity:10}],preview:{lines:[orderDetail().items[0].snapshot],net_minor:10000,tax_minor:1000,total_minor:11000},loading:false,error:'',clearCart:clearMock} as never);
 jest.mocked(orderPost).mockResolvedValue({id:oid});
 render(<Checkout/>);expect(screen.queryByLabelText('사업자번호')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('연락처'),{target:{value:'010-0000-0000'}});fireEvent.change(screen.getByLabelText('우편번호'),{target:{value:'12345'}});fireEvent.change(screen.getByLabelText('주소'),{target:{value:'서울 테스트 주소'}});
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.submit(screen.getByRole('button',{name:'주문 접수하기'}).closest('form')!);
 await waitFor(()=>expect(pushMock).toHaveBeenCalledWith('/account/orders/'+oid));
 expect(clearMock).toHaveBeenCalled();expect(orderPost).toHaveBeenCalledWith('/api/orders',expect.objectContaining({items:[{product_id:'food',unit:'EA',quantity:10}],evidence_request:expect.objectContaining({kind:'none',registration_no:''})}));
});
test('anonymous checkout links to email signup and cannot submit',()=>{
 jest.mocked(useAuth).mockReturnValue({loading:false,user:null} as never);jest.mocked(useCart).mockReturnValue({cartItems:[]} as never);
 render(<Checkout/>);expect(screen.getByRole('link',{name:'로그인 / 회원가입'})).toBeInTheDocument();expect(screen.queryByRole('button',{name:'주문 접수하기'})).not.toBeInTheDocument();
});
