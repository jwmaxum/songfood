/** @jest-environment jsdom */
import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
jest.mock('@/app/admin/crm/PiPanel',()=>({__esModule:true,default:()=>null}));
import CrmWorkspace from '@/app/admin/crm/CrmWorkspace';
const inquiry={id:'i1',kind:'domestic_wholesale',company:'개인 구매',contact_name:'Buyer',email:'buyer@example.invalid',items:[],status:'new',revision:7};
const detail={inquiry,activities:[],quotes:[],notifications:[],attempts:[]};
const response=(body:unknown,ok=true)=>({ok,json:async()=>body});
afterEach(cleanup);
test('private note retry keeps key and revision, preserves failed input and clears on success',async()=>{
 const writes:Record<string,unknown>[]=[];let fail=true;
 global.fetch=jest.fn(async(_url,init)=>{if(init?.method==='POST'){writes.push(JSON.parse(String(init.body)));if(fail)return response({error:'retry required'},false);return response({success:true});}return response(detail);}) as jest.Mock;
 render(<CrmWorkspace id="i1" staff={[]} changed={()=>{}}/>);
 const field=await screen.findByLabelText('검토·회신 내용');fireEvent.change(field,{target:{value:'Internal stock review'}});fireEvent.click(screen.getByText('기록 저장'));
 await screen.findByText('retry required');expect((field as HTMLTextAreaElement).value).toBe('Internal stock review');
 fail=false;fireEvent.click(screen.getByText('기록 저장'));
 await waitFor(()=>expect((field as HTMLTextAreaElement).value).toBe(''));
 expect(writes).toHaveLength(2);expect(writes[0]).toEqual(writes[1]);expect(writes[0]).toMatchObject({action:'note',revision:7,message:'Internal stock review'});
 expect(writes[0].request_key).toMatch(/^[0-9a-f-]{36}$/);
});
test('saved write with failed refresh is reported saved and cannot retain old note as unsaved',async()=>{
 let written=false;
 global.fetch=jest.fn(async(_url,init)=>{if(init?.method==='POST'){written=true;return response({success:true});}return written?response({error:'read failed'},false):response(detail);}) as jest.Mock;
 render(<CrmWorkspace id="i1" staff={[]} changed={()=>{}}/>);
 const field=await screen.findByLabelText('검토·회신 내용');fireEvent.change(screen.getByLabelText('기록 공개 범위'),{target:{value:'reply'}});
 fireEvent.change(field,{target:{value:'Public response'}});fireEvent.click(screen.getByText('기록 저장'));
 await screen.findByText(/저장은 완료되었습니다/);expect((field as HTMLTextAreaElement).value).toBe('');
 const write=(fetch as jest.Mock).mock.calls.find(([,init])=>init?.method==='POST');expect(JSON.parse(write[1].body).action).toBe('reply');
});
