/** @jest-environment jsdom */
import {render,screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import PiPanel from '@/app/admin/crm/PiPanel';
import type {CrmInquiry} from '@/lib/crm/types';
import {input} from './fixtures/pi';
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}));
test('RFQ uses one seller settings editor and explicitly refreshes stored defaults',async()=>{
 const original=global.fetch;const response=(name:string)=>({ok:true,json:async()=>({is_admin:true,documents:[],events:[],settings:{revision:1,data:{...input.seller,name}}})});
 const fetcher=jest.fn().mockResolvedValue(response('QA ORIGINAL SELLER'));global.fetch=fetcher;
 try{render(<PiPanel inquiry={{id:'inquiry',revision:1} as CrmInquiry} changed={()=>{}}/>);
 expect(await screen.findByText('QA ORIGINAL SELLER')).toBeInTheDocument();expect(screen.getByRole('link',{name:'PI 판매자 기본정보 수정'})).toHaveAttribute('href','/admin/settings#pi-issuer');
 expect(screen.queryByRole('button',{name:'기본정보 저장'})).not.toBeInTheDocument();
 fetcher.mockResolvedValue(response('QA UPDATED SELLER'));fireEvent.click(screen.getByRole('button',{name:'PI 새로고침'}));expect(await screen.findByText('QA UPDATED SELLER')).toBeInTheDocument();
 expect(fetcher.mock.calls.every(c=>!c[1]?.method||c[1].method==='GET')).toBe(true);
 }finally{global.fetch=original;}
});
