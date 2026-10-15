import {readFileSync} from 'node:fs';
import {PDFArray, PDFDict, PDFDocument, PDFName, PDFPage, PDFString} from 'pdf-lib';
import {renderCataloguePdf} from '@/lib/catalogue/pdf';
import {CATALOGUE_PRODUCT_FIELDS, type CatalogueProduct, type CatalogueSnapshot} from '@/lib/catalogue/types';

const font=new Uint8Array(readFileSync('public/fonts/NanumGothic-Regular.ttf'));
function product(index=1,fields:Partial<CatalogueProduct>={}):CatalogueProduct{
 return {...Object.fromEntries(CATALOGUE_PRODUCT_FIELDS.map(key=>[key,''])),id:'qa-catalogue-'+index,name:'한글 만두 '+index,name_en:'Korean dumplings '+index,sku:'CAT-'+index,collection:'HMR',category:'Dumpling',brand:'Bibigo',image_url:'/images/coming-soon.png',...fields} as CatalogueProduct;
}
function snapshot(count=1,overrides:Partial<CatalogueSnapshot>={}):CatalogueSnapshot{
 return {version:1,language:'ko',generated_at:'2026-10-15T16:00:00.000Z',filename:'songfood-catalogue-ko-2026-10-16.pdf',site_origin:'https://catalogue.example',seller:{name:'송영민푸드',email:'catalogue@example.invalid',phone:'010-1234-5678',export_phone:'+82-10-2345-6789'},products:Array.from({length:count},(_,i)=>product(i+1)),...overrides};
}
function uris(pdf:PDFDocument){return pdf.getPages().flatMap(page=>{
 const annots=page.node.lookupMaybe(PDFName.of('Annots'),PDFArray);return annots?annots.asArray().map(ref=>{
  const annotation=pdf.context.lookup(ref,PDFDict),action=annotation.lookup(PDFName.of('A'),PDFDict);return action.lookup(PDFName.of('URI'),PDFString).decodeText();
 }):[];
});}
afterEach(()=>{jest.restoreAllMocks();});

test('a full 53-product Korean catalogue is a deterministic 14-page A4 PDF with exactly one safe link per product',async()=>{
 const source=snapshot(53),a=await renderCataloguePdf(source,font),b=await renderCataloguePdf(source,font);
 expect(Buffer.from(a).subarray(0,5).toString()).toBe('%PDF-');expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
 expect(a.byteLength).toBeLessThan(4*1024*1024);const pdf=await PDFDocument.load(a);expect(pdf.getPageCount()).toBe(14);
 expect(pdf.getPages().every(page=>Math.abs(page.getWidth()-595.28)<.01&&Math.abs(page.getHeight()-841.89)<.01)).toBe(true);
 expect(pdf.getTitle()).toContain('상품 카탈로그');expect(pdf.getAuthor()).toBe('송영민푸드');expect(pdf.getCreationDate()?.toISOString()).toBe(source.generated_at);
 expect(uris(pdf)).toEqual(source.products.map(p=>'https://catalogue.example/products/'+p.id+'?lang=ko'));
},30000);

test.each([0,501])('unsupported catalogue size %i fails without producing a truncated document',async count=>{
 await expect(renderCataloguePdf(snapshot(count),font)).rejects.toThrow();
});

test('invalid snapshot version, language, date or font cannot produce a corrupt download',async()=>{
 for(const patch of [{version:2},{language:'ja'},{generated_at:'not-a-date'}])await expect(renderCataloguePdf(snapshot(1,patch as Partial<CatalogueSnapshot>),font)).rejects.toThrow();
 await expect(renderCataloguePdf(snapshot(),new Uint8Array([1,2,3]))).rejects.toThrow();
});

test('English names fall back to Korean and blank product metadata remains explicitly unverified',async()=>{
 const draw=jest.spyOn(PDFPage.prototype,'drawText');const source=snapshot(2,{language:'en',products:[product(1,{name_en:'',name:'한국어 상품만 등록'}),product(2,{name:'',name_en:''})]});
 const bytes=await renderCataloguePdf(source,font),pdf=await PDFDocument.load(bytes),text=draw.mock.calls.map(([value])=>value).join('\n');
 expect(text).toContain('한국어 상품만');expect(text).toContain('To be confirmed');expect(text).toContain('Image pending');
 expect(text).toContain('Prices and sales approval excluded.');expect(text).toContain('not a quotation or Proforma Invoice');
 expect(text).not.toContain('undefined');expect(text).not.toContain('null');expect(text).not.toContain('Made in Korea');
 expect(pdf.getPageCount()).toBe(1);expect(uris(pdf).every(uri=>uri.endsWith('?lang=en'))).toBe(true);
});

test('unsupported glyphs are replaced transparently and control characters never enter PDF text',async()=>{
 const draw=jest.spyOn(PDFPage.prototype,'drawText');const source=snapshot(1,{products:[product(1,{name:'상품 😀\u0000\n 확인',name_en:''})]});
 const bytes=await renderCataloguePdf(source,font),text=draw.mock.calls.map(([value])=>value).join('\n');expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
 expect(text).toContain('글꼴 미지원 문자는 ?로 표시했습니다.');expect(text).not.toContain('😀');expect(text).not.toContain('\u0000');
});

test('an invalid image falls back without dropping a product card and long labels stay within bounded rows',async()=>{
 const draw=jest.spyOn(PDFPage.prototype,'drawText');const source=snapshot(5,{products:Array.from({length:5},(_,i)=>product(i+1,{name:'긴 상품 설명 '.repeat(80),name_en:'Long product description '.repeat(80),manufacturer:'제조업체 확인 '.repeat(100),storage:'보관조건 확인 '.repeat(100),shelf_life:'소비기한 확인 '.repeat(100)}))});
 const images=new Map([[source.products[0].image_url,{bytes:new Uint8Array([1,2,3]),kind:'png' as const}]]);
 const bytes=await renderCataloguePdf(source,font,images),pdf=await PDFDocument.load(bytes),text=draw.mock.calls.map(([value])=>value).join('\n');
 expect(pdf.getPageCount()).toBe(2);expect(uris(pdf)).toHaveLength(5);expect(text).toContain('...');expect(text).toContain('이미지 확인 필요');
});

test('a bundled JPEG image is embedded once and repeated products reuse the image object',async()=>{
 const image=new Uint8Array(readFileSync('public/images/products/coming-soon.png')),source=snapshot(5),images=new Map([[source.products[0].image_url,{bytes:image,kind:'jpg' as const}]]);
 const pdf=await PDFDocument.load(await renderCataloguePdf(source,font,images));

 // The checked-in .png URL has JPEG magic; the browser chooses its actual detected kind.
 const refs=pdf.getPages().flatMap(page=>{const resources=page.node.Resources();const xobjects=resources?.lookupMaybe(PDFName.of('XObject'),PDFDict);return xobjects?xobjects.values().map(value=>value.toString()):[];});
 expect(refs.length).toBeGreaterThan(0);expect(new Set(refs).size).toBe(1);
},30000);




test('Celsius and Fahrenheit symbols retain their meaning in either catalogue language without changing saved data',async()=>{
 const sourceValue='0~5\u2103 / -18\u2103 / 32\u2109';
 for(const language of ['ko','en'] as const){
  const source=snapshot(1,{language,products:[product(1,{storage:sourceValue})]});
  const draw=jest.spyOn(PDFPage.prototype,'drawText');
  const bytes=await renderCataloguePdf(source,font),text=draw.mock.calls.map(([value])=>value).join('\n');
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  expect(text).toContain('0~5\u00b0C');expect(text).toContain('-18\u00b0C');expect(text).toContain('32\u00b0F');
  expect(text).not.toContain('\u2103');expect(text).not.toContain('\u2109');
  expect(text).not.toContain('글꼴 미지원');expect(text).not.toContain('Unsupported font characters');
  expect(source.products[0].storage).toBe(sourceValue);draw.mockRestore();
 }
});
