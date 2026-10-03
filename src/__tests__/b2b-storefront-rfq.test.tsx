/** @jest-environment jsdom */
import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {RFQProvider,useRFQ} from '@/context/RFQContext';
import {useAuth} from '@/context/AuthContext';
import {RFQ_STORAGE_KEY} from '@/lib/storefront';
jest.mock('@/context/AuthContext',()=>({useAuth:jest.fn()}));
function Harness(){
 const q=useRFQ();
 return <div><p>{q.ready?'ready':'loading'}</p><output data-testid="items">{JSON.stringify(q.items)}</output><output data-testid="buyer">{q.buyerDraft.email}</output>
 <button onClick={()=>q.add('p1',3)}>add</button><button onClick={()=>q.setQuantity('p1',0)}>invalid</button><button onClick={()=>q.remove('p1')}>remove</button>
 <button onClick={()=>q.setBuyerDraft({...q.buyerDraft,email:'buyer@example.invalid'})}>contact</button></div>;
}
beforeEach(()=>{localStorage.clear();(useAuth as jest.Mock).mockReturnValue({user:{id:'a'}});});
afterEach(cleanup);
test('RFQ quantities survive remount; invalid edits and stored prices are excluded',async()=>{
 localStorage.setItem(RFQ_STORAGE_KEY,JSON.stringify([{product_id:'p1',quantity:2,price:1}]));
 const first=render(<RFQProvider><Harness/></RFQProvider>);
 await screen.findByText('ready');
 fireEvent.click(screen.getByText('add'));fireEvent.click(screen.getByText('invalid'));
 expect(screen.getByTestId('items').textContent).toBe('[{"product_id":"p1","quantity":5}]');
 await waitFor(()=>expect(JSON.parse(localStorage.getItem(RFQ_STORAGE_KEY)!)).toEqual([{product_id:'p1',quantity:5}]));
 first.unmount();render(<RFQProvider><Harness/></RFQProvider>);await screen.findByText('ready');
 expect(screen.getByTestId('items').textContent).toContain('"quantity":5');
 fireEvent.click(screen.getByText('remove'));expect(screen.getByTestId('items').textContent).toBe('[]');
});
test('buyer contact is memory-only and hidden immediately after account changes',async()=>{
 const view=render(<RFQProvider><Harness/></RFQProvider>);await screen.findByText('ready');fireEvent.click(screen.getByText('contact'));
 expect(screen.getByTestId('buyer').textContent).toBe('buyer@example.invalid');
 expect(localStorage.getItem(RFQ_STORAGE_KEY)).not.toContain('buyer@example.invalid');
 (useAuth as jest.Mock).mockReturnValue({user:{id:'b'}});
 view.rerender(<RFQProvider><Harness/></RFQProvider>);expect(screen.getByTestId('buyer').textContent).toBe('');
});
test('corrupt browser state keeps the RFQ usable',async()=>{
 localStorage.setItem(RFQ_STORAGE_KEY,'{bad');render(<RFQProvider><Harness/></RFQProvider>);await screen.findByText('ready');
 fireEvent.click(screen.getByText('add'));expect(screen.getByTestId('items').textContent).toContain('"quantity":3');
});
