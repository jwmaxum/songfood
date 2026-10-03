import {readFileSync} from 'node:fs';
import {PDFDocument} from 'pdf-lib';
import {renderPiPdf} from '@/lib/pi/pdf';
import {sample} from './fixtures/pi';
const font=new Uint8Array(readFileSync('public/fonts/NanumGothic-Regular.ttf'));
test('Korean PDF creation is deterministic for upload replay and spans pages',async()=>{
 const d=sample();d.snapshot.lines=Array.from({length:28},(_,i)=>({...d.snapshot.lines[0],product_id:'p'+i,sku:'TEST-'+i,name:'한글 상품 이름 및 포장 정보 / Korean food '+i}));d.snapshot.total_minor=d.snapshot.lines.reduce((n,l)=>n+l.total_minor,0);
 const a=await renderPiPdf(d,font),b=await renderPiPdf(d,font);
 expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);expect((await PDFDocument.load(a)).getPageCount()).toBeGreaterThan(2);
 expect(a.length).toBeLessThan(10485760);
},30000);
test('unsupported characters fail visibly instead of silently corrupting buyer names',async()=>{
 const d=sample();d.snapshot.buyer.name='Unsupported 😀';
 await expect(renderPiPdf(d,font)).rejects.toHaveProperty('fields.pdf');
});
