/** @jest-environment jsdom */
import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import CustomerPi from '@/components/pi/CustomerPi';
import {useAuth} from '@/context/AuthContext';
import {sample,quote,input} from './fixtures/pi';
import PiPanel from '@/app/admin/crm/PiPanel';
import type {CrmInquiry} from '@/lib/crm/types';
jest.mock('@/context/AuthContext',()=>({useAuth:jest.fn()}));
const doc={...sample(),inquiry_id:'inquiry',supersedes_id:null,status:'issued',issued_at:'2026-10-03',accepted_at:null,change_requested_at:null,pdf_sha256:'public hash'};
const reply=(body:unknown,ok=true)=>({ok,json:async()=>body});
beforeEach(()=>{(useAuth as jest.Mock).mockReturnValue({user:{id:'buyer'}});});
afterEach(cleanup);
test('customer acceptance requires explicit checkbox and keeps retry intent; auth change removes visible PI',async()=>{
 const current={...doc,snapshot:{...doc.snapshot,valid_until:'2099-01-01T00:00:00Z'}};let fail=true;const posts:Record<string,unknown>[]=[];
 global.fetch=jest.fn(async(url,options)=>{if(options?.method==='POST'){posts.push(JSON.parse(String(options.body)));return fail?reply({error:'Try again'},false):reply({document:{...current,accepted_at:'2026-10-03'}});}return String(url).endsWith('/pi')?reply({documents:[current]}):reply({document:current});}) as jest.Mock;
 const view=render(<CustomerPi/>);fireEvent.click(await screen.findByText(/SAMPLE-NOT-ISSUED/));
 const accept=await screen.findByRole('button',{name:'조건 수락 / Accept terms'});expect((accept as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(accept);await screen.findByText('Try again');fail=false;fireEvent.click(accept);
 await screen.findByText(/Acceptance recorded/);expect(posts).toHaveLength(2);expect(posts[0].request_key).toBe(posts[1].request_key);expect(posts[0].confirmed).toBe(true);
 (useAuth as jest.Mock).mockReturnValue({user:null});view.rerender(<CustomerPi/>);expect(screen.queryByText(/SHA-256/)).toBeNull();
});
test('expired documents remain downloadable but have no accept control',async()=>{
 global.fetch=jest.fn(async url=>String(url).endsWith('/pi')?reply({documents:[{...doc,snapshot:{...doc.snapshot,valid_until:'2000-01-01T00:00:00Z'}}]}):reply({document:{...doc,snapshot:{...doc.snapshot,valid_until:'2000-01-01T00:00:00Z'}}})) as jest.Mock;
 render(<CustomerPi/>);fireEvent.click(await screen.findByText(/SAMPLE-NOT-ISSUED/));await screen.findByRole('link',{name:'PDF 다운로드 / Download PDF'});
 await waitFor(()=>expect(screen.queryByRole('button',{name:'조건 수락 / Accept terms'})).toBeNull());expect(screen.getByText(/현재 문서는 수락할 수 없습니다/)).toBeTruthy();
});

test('admin must review again when quote version or inquiry revision changes',async()=>{
 const detail={is_admin:true,documents:[],events:[],settings:{revision:1,data:input.seller}};
 global.fetch=jest.fn(async(_url,options)=>options?.method==='POST'?reply({snapshot:sample().snapshot}):reply(detail)) as jest.Mock;
 const inquiry={id:'inquiry',revision:1} as CrmInquiry,q=quote(),changed=jest.fn();
 const view=render(<PiPanel inquiry={inquiry} latest={q} changed={changed}/>);
 const preview=await screen.findByRole('button',{name:'발행 전 고객용 미리보기'});
 fireEvent.submit(preview.closest('form')!);
 expect(await screen.findByRole('button',{name:'확인한 PI 발행'})).toBeTruthy();
 view.rerender(<PiPanel inquiry={{...inquiry,revision:2}} latest={{...q,id:'new-quote'}} changed={changed}/>);
 expect(screen.queryByRole('button',{name:'확인한 PI 발행'})).toBeNull();
 fireEvent.submit(screen.getByRole('button',{name:'발행 전 고객용 미리보기'}).closest('form')!);
 expect(await screen.findByRole('button',{name:'확인한 PI 발행'})).toBeTruthy();
});
