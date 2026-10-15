import {catalogueImageKind,catalogueImageUrl,createCataloguePdf} from '@/lib/catalogue/pdf-client';
import {renderCataloguePdf} from '@/lib/catalogue/pdf';
import {CATALOGUE_PRODUCT_FIELDS,type CatalogueProduct,type CatalogueSnapshot} from '@/lib/catalogue/types';
jest.mock('@/lib/catalogue/pdf',()=>({renderCataloguePdf:jest.fn()}));
const origin='https://shop.example';
const windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
function png(width=1,height=1,length=24){const bytes=new Uint8Array(length);bytes.set([137,80,78,71,13,10,26,10]);const data=new DataView(bytes.buffer);data.setUint32(16,width);data.setUint32(20,height);return bytes;}
function jpg(width=1,height=1){return new Uint8Array([255,216,255,192,0,11,8,height>>8,height&255,width>>8,width&255,1,1,17,0]);}
function snapshot(urls=['/images/products/coming-soon.png']):CatalogueSnapshot{
 return {version:1,language:'en',generated_at:'2026-10-15T04:00:00Z',filename:'catalogue.pdf',site_origin:origin,seller:{name:'SONGFOOD',email:'',phone:'',export_phone:''},products:urls.map((image_url,i)=>({...Object.fromEntries(CATALOGUE_PRODUCT_FIELDS.map(key=>[key,''])),id:'qa-'+i,name:'상품 '+i,image_url}) as CatalogueProduct)};
}
function asset(bytes:Uint8Array,headers:Record<string,string>={}){return new Response(new Uint8Array(bytes),{headers});}
let fetchMock:jest.SpyInstance;
beforeEach(()=>{
 jest.clearAllMocks();Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{origin}}});
 jest.mocked(renderCataloguePdf).mockResolvedValue(new Uint8Array([37,80,68,70,45]));
 fetchMock=jest.spyOn(globalThis,'fetch').mockImplementation(async()=>asset(png()));
});
afterEach(()=>{fetchMock.mockRestore();});
afterAll(()=>{if(windowDescriptor)Object.defineProperty(globalThis,'window',windowDescriptor);else Reflect.deleteProperty(globalThis,'window');});

test('only same-origin static images, configured Supabase public objects and exact Unsplash photos are accepted',()=>{
 expect(catalogueImageUrl('/images/products/coming-soon.png',origin)).toBe(origin+'/images/products/coming-soon.png');
 expect(catalogueImageUrl(origin+'/images/a.jpeg',origin)).toBe(origin+'/images/a.jpeg');
 expect(catalogueImageUrl('https://project.supabase.co/storage/v1/object/public/product-images/a.png',origin,'https://project.supabase.co')).toBe('https://project.supabase.co/storage/v1/object/public/product-images/a.png');
 expect(catalogueImageUrl('https://images.unsplash.com/photo-123-abc?url=https://private.invalid&fm=webp&w=9999',origin)).toBe('https://images.unsplash.com/photo-123-abc?fm=jpg&w=480&q=75&fit=max');
 expect(catalogueImageUrl('/images/a.JPG','http://localhost:3000')).toBe('http://localhost:3000/images/a.JPG');
});

test.each([
 '//private.invalid/photo.png','https://private.invalid/images/a.png','http://images.unsplash.com/photo-abc',
 'https://images.unsplash.com.evil.example/photo-abc','https://user:password@images.unsplash.com/photo-abc',
 'https://images.unsplash.com/photo-abc#fragment','https://images.unsplash.com:8443/photo-abc',
 'https://images.unsplash.com/not-a-photo','https://project.supabase.co/storage/v1/object/sign/products/a.png',
 'https://other.supabase.co/storage/v1/object/public/products/a.png','/api/private.pdf','/images/a.svg','/images/a.webp',
 '/images/../private.png','/images/%2e%2e/private.png','/images/a\\b.png','/images/a\n.png','data:image/png;base64,AA==','blob:https://shop.example/123','javascript:alert(1)',
])('unsafe or unsupported image address never reaches fetch: %s',value=>{
 expect(catalogueImageUrl(value,origin,'https://project.supabase.co')).toBeNull();
});

test('a local development port never permits the same custom port on an external image service',()=>{
 expect(catalogueImageUrl('https://images.unsplash.com:3000/photo-abc','http://localhost:3000')).toBeNull();
});

test('PNG/JPEG signatures and positive dimensions are checked before decoding, including typed-array offsets',()=>{
 expect(catalogueImageKind(png(1000,2000))).toBe('png');expect(catalogueImageKind(png(1001,2000))).toBeNull();expect(catalogueImageKind(png(0,1))).toBeNull();
 expect(catalogueImageKind(jpg(2000,1000))).toBe('jpg');expect(catalogueImageKind(jpg(2001,1000))).toBeNull();expect(catalogueImageKind(jpg(1,0))).toBeNull();
 const padded=new Uint8Array(40);padded.set(png(40,50),8);expect(catalogueImageKind(padded.subarray(8,32))).toBe('png');
 for(const bytes of [new Uint8Array(),new Uint8Array([255,216]),new Uint8Array([71,73,70,56,57,97]),new Uint8Array([255,216,255,192,255,255,8,0,1,0,1])])expect(catalogueImageKind(bytes)).toBeNull();
});

test('font is loaded from a fixed path and duplicate product photos share one anonymous non-redirecting fetch',async()=>{
 const source=snapshot(['/images/products/coming-soon.png','/images/products/coming-soon.png']);
 const bytes=await createCataloguePdf(source);expect(Array.from(bytes)).toEqual([37,80,68,70,45]);expect(fetchMock).toHaveBeenCalledTimes(2);
 expect(fetchMock.mock.calls[0]).toEqual(['/fonts/NanumGothic-Regular.ttf',expect.objectContaining({credentials:'omit',signal:expect.any(AbortSignal)})]);
 expect(fetchMock.mock.calls[1]).toEqual([origin+'/images/products/coming-soon.png',expect.objectContaining({credentials:'omit',redirect:'error',signal:expect.any(AbortSignal)})]);
 const images=jest.mocked(renderCataloguePdf).mock.calls[0][2]!;expect(images.size).toBe(1);expect(images.get(source.products[0].image_url)).toMatchObject({kind:'png'});
});

test('missing or oversized mandatory font fails visibly instead of producing a corrupt PDF',async()=>{
 fetchMock.mockResolvedValueOnce(new Response('not found',{status:404}));await expect(createCataloguePdf(snapshot())).rejects.toThrow();expect(renderCataloguePdf).not.toHaveBeenCalled();
 fetchMock.mockResolvedValueOnce(asset(png(),{'Content-Length':String(3*1024*1024+1)}));await expect(createCataloguePdf(snapshot())).rejects.toThrow();expect(renderCataloguePdf).not.toHaveBeenCalled();
});

test('failed, redirected, oversize, unsupported and decompression-bomb images use placeholders without dropping products',async()=>{
 const urls=['/images/fail.png','/images/redirect.png','/images/large.png','/images/unsupported.png','/images/bomb.png','https://private.invalid/pixel.png'];
 fetchMock.mockImplementation(async input=>{
  if(input==='/fonts/NanumGothic-Regular.ttf')return asset(png());
  const url=String(input);
  if(url.endsWith('/fail.png'))return new Response('unavailable',{status:404});
  if(url.endsWith('/redirect.png'))throw new TypeError('Redirect rejected');
  if(url.endsWith('/large.png'))return asset(png(),{'Content-Length':String(2*1024*1024+1)});
  if(url.endsWith('/unsupported.png'))return asset(new Uint8Array([71,73,70,56,57,97]));
  return asset(png(3000,3000));
 });
 const source=snapshot(urls);await createCataloguePdf(source);const [passed,,images]=jest.mocked(renderCataloguePdf).mock.calls[0];
 expect(passed.products).toHaveLength(6);expect(images!.size).toBe(0);expect(fetchMock.mock.calls.some(([input])=>String(input).includes('private.invalid'))).toBe(false);
});

test('streamed images cannot bypass the byte ceiling with an absent Content-Length header',async()=>{
 const cancelled=jest.fn();fetchMock.mockImplementation(async input=>input==='/fonts/NanumGothic-Regular.ttf'?asset(png()):new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(png(1,1,2*1024*1024+1));},cancel:cancelled})));
 await createCataloguePdf(snapshot());expect(cancelled).toHaveBeenCalled();expect(jest.mocked(renderCataloguePdf).mock.calls[0][2]!.size).toBe(0);
});

test('the image count, total bytes and concurrent requests remain bounded for a full catalogue',async()=>{
 const urls=Array.from({length:40},(_,i)=>'/images/product-'+i+'.png');let active=0,maxActive=0;
 fetchMock.mockImplementation(async input=>{
  if(input==='/fonts/NanumGothic-Regular.ttf')return asset(png());
  active++;maxActive=Math.max(maxActive,active);await new Promise(resolve=>setTimeout(resolve,2));active--;return asset(png());
 });
 await createCataloguePdf(snapshot(urls));expect(fetchMock).toHaveBeenCalledTimes(33);expect(maxActive).toBeLessThanOrEqual(2);expect(jest.mocked(renderCataloguePdf).mock.calls[0][2]!.size).toBe(32);
 fetchMock.mockClear();jest.mocked(renderCataloguePdf).mockClear();fetchMock.mockImplementation(async input=>asset(input==='/fonts/NanumGothic-Regular.ttf'?png():png(1,1,2*1024*1024)));
 await createCataloguePdf(snapshot(urls));expect(fetchMock).toHaveBeenCalledTimes(7);expect(jest.mocked(renderCataloguePdf).mock.calls[0][2]!.size).toBe(6);
});

test('the real coming-soon asset is accepted according to its JPEG bytes despite its PNG URL',async()=>{
 const {readFileSync}=await import('node:fs');
 const bytes=new Uint8Array(readFileSync('public/images/products/coming-soon.png'));
 expect(catalogueImageKind(bytes)).toBe('jpg');expect(bytes.byteLength).toBeLessThan(2*1024*1024);
});
