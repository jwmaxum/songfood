import {POST} from '@/app/api/upload/route';
import {getStaffIdentity} from '@/lib/admin-auth';
import {addMediaItem} from '@/lib/media-db';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {readUploadFile} from '@/lib/uploads/request';
import {inspectUpload,MAX_IMAGE_BYTES,MAX_VIDEO_BYTES,MAX_MULTIPART_BYTES,MAX_IMAGE_PIXELS} from '@/lib/uploads/validation';

jest.mock('@/lib/admin-auth',()=>({getStaffIdentity:jest.fn()}));
jest.mock('@/lib/media-db',()=>({addMediaItem:jest.fn()}));
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{storage:{from:jest.fn()},rpc:jest.fn()},isAuthConfigured:()=>true,isSupabaseConfigured:()=>true}));

const app='https://shop.example',storage='https://project.supabase.co';
const actor={id:'00000000-0000-4000-8000-000000000861',email:'upload@example.invalid',role:'admin' as const};
const bucket={upload:jest.fn(),getPublicUrl:jest.fn(),remove:jest.fn()};
const oldEnv=Object.fromEntries(['NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','TRUST_CLOUDFLARE_IP'].map(key=>[key,process.env[key]]));
let log:jest.SpyInstance;
function png(width=1,height=1){const bytes=new Uint8Array(33);bytes.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);const view=new DataView(bytes.buffer);view.setUint32(16,width);view.setUint32(20,height);return bytes;}
function gif(width=1,height=1){const bytes=new Uint8Array(16);bytes.set(new TextEncoder().encode('GIF89a'));const view=new DataView(bytes.buffer);view.setUint16(6,width,true);view.setUint16(8,height,true);return bytes;}
function jpeg(width=1,height=1){return new Uint8Array([255,216,255,224,0,4,0,0,255,192,0,11,8,height>>8,height&255,width>>8,width&255,1,1,17,0,255,217]);}
function webp(chunk:'VP8X'|'VP8L'|'VP8 '= 'VP8X',width=1,height=1){
 const bytes=new Uint8Array(40);bytes.set(new TextEncoder().encode('RIFF'));new DataView(bytes.buffer).setUint32(4,32,true);bytes.set(new TextEncoder().encode('WEBP'+chunk),8);
 if(chunk==='VP8X'){const w=width-1,h=height-1;bytes.set([w&255,w>>8&255,w>>16&255,h&255,h>>8&255,h>>16&255],24);}
 else if(chunk==='VP8L'){const w=width-1,h=height-1;bytes.set([47,w&255,(w>>8&63)|(h&3)<<6,h>>2&255,h>>10&15],20);}
 else {bytes.set([157,1,42],23);const view=new DataView(bytes.buffer);view.setUint16(26,width,true);view.setUint16(28,height,true);}
 return bytes;
}
function mp4(){const bytes=new Uint8Array(24);new DataView(bytes.buffer).setUint32(0,24);bytes.set(new TextEncoder().encode('ftypisom'),4);return bytes;}
function webm(){return new Uint8Array([26,69,223,163,0,0,0,0,...new TextEncoder().encode('webm'),0,0,0,0]);}
function file(bytes=png(),type='image/png',name='상품.png'){return new File([new Uint8Array(bytes)],name,{type});}
function request(data:FormData|File=file(),headers:Record<string,string>={}){
 const form=data instanceof FormData?data:new FormData();if(data instanceof File)form.append('file',data);
 return new Request(app+'/api/upload',{method:'POST',headers:{Origin:app,...headers},body:form});
}
function streamRequest(stream:ReadableStream<Uint8Array>,headers:Record<string,string>={}){
 return new Request(app+'/api/upload',{method:'POST',headers:{Origin:app,'Content-Type':'multipart/form-data; boundary=fixture-upload',...headers},body:stream,duplex:'half'} as RequestInit&{duplex:'half'});
}
function noStorageWrite(){expect(bucket.upload).not.toHaveBeenCalled();expect(bucket.remove).not.toHaveBeenCalled();expect(addMediaItem).not.toHaveBeenCalled();}

beforeEach(()=>{
 jest.clearAllMocks();process.env.NEXT_PUBLIC_APP_URL=app;process.env.NEXT_PUBLIC_SUPABASE_URL=storage;process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-service-role-key-not-live';process.env.TRUST_CLOUDFLARE_IP='1';
 jest.mocked(getStaffIdentity).mockResolvedValue(actor);jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:true,error:null} as never);
 jest.mocked(supabaseAdmin.storage.from).mockReturnValue(bucket as never);bucket.upload.mockResolvedValue({data:{path:'owned-new-file'},error:null});bucket.remove.mockResolvedValue({data:[],error:null});
 bucket.getPublicUrl.mockImplementation((path:string)=>({data:{publicUrl:storage+'/storage/v1/object/public/media/'+path}}));
 jest.mocked(addMediaItem).mockImplementation(async item=>({...item,id:'00000000-0000-4000-8000-000000000862',created_at:'2026-10-15T05:00:00Z'}));
 log=jest.spyOn(console,'error').mockImplementation(()=>undefined);
});
afterEach(()=>log.mockRestore());
afterAll(()=>{for(const [key,value]of Object.entries(oldEnv)){if(value===undefined)delete process.env[key];else process.env[key]=value;}});

test.each(['admin','product_staff'] as const)('%s uploads a real multipart File to a fresh UUID path and receives persisted public metadata',async role=>{
 jest.mocked(getStaffIdentity).mockResolvedValue({...actor,role});
 const response=await POST(request(file(png(),'image/png','../../unsafe-original.exe')));expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
 const body=await response.json(),[path,uploaded,options]=bucket.upload.mock.calls[0];
 expect(path).toMatch(/^uploads\/[0-9a-f-]{36}\.png$/);expect(path).not.toContain('unsafe-original');expect(uploaded).toBeInstanceOf(File);
 expect(options).toEqual({contentType:'image/png',upsert:false,cacheControl:'31536000'});expect(supabaseAdmin.storage.from).toHaveBeenCalledWith('media');
 expect(body).toMatchObject({success:true,data:{url:storage+'/storage/v1/object/public/media/'+path,type:'image',id:expect.any(String)}});
 expect(addMediaItem).toHaveBeenCalledWith(expect.objectContaining({url:body.data.url,type:'image',size:'0.00 MB'}));expect(bucket.remove).not.toHaveBeenCalled();
});

test.each([null,{...actor,role:'customer'},{...actor,role:'inquiry_staff'},{...actor,role:'order_staff'}])('anonymous, customer or unrelated staff cannot upload %j',async identity=>{
 jest.mocked(getStaffIdentity).mockResolvedValue(identity as Awaited<ReturnType<typeof getStaffIdentity>>);
 expect((await POST(request())).status).toBe(403);expect(supabaseAdmin.rpc).not.toHaveBeenCalled();noStorageWrite();
});

test('cross-origin and absent-origin cookie requests fail before parsing or storage even with a valid staff session',async()=>{
 const foreign=request(file(),{Origin:'https://attacker.invalid'}),foreignReader=jest.spyOn(foreign.body!,'getReader');expect((await POST(foreign)).status).toBe(403);expect(foreignReader).not.toHaveBeenCalled();
 const absent=request();absent.headers.delete('Origin');expect((await POST(absent)).status).toBe(403);expect(getStaffIdentity).not.toHaveBeenCalled();expect(supabaseAdmin.rpc).not.toHaveBeenCalled();noStorageWrite();
});

test('bearer origin exception still requires verified staff and uploads no credentials into asset metadata',async()=>{
 const input=request(file(),{Authorization:'Bearer fixture-upload-token-not-live'});input.headers.delete('Origin');const response=await POST(input);expect(response.status).toBe(200);
 expect(JSON.stringify(await response.json())).not.toContain('fixture-upload-token-not-live');expect(JSON.stringify(bucket.upload.mock.calls)).not.toContain('fixture-upload-token-not-live');
});

test('actor rate limits are independent of claimed proxy IP and fail closed on protection errors',async()=>{
 await POST(request(file(),{'CF-Connecting-IP':'192.0.2.1'}));await POST(request(file(),{'CF-Connecting-IP':'192.0.2.2'}));
 const first=jest.mocked(supabaseAdmin.rpc).mock.calls[0][1] as {p_key:string};const second=jest.mocked(supabaseAdmin.rpc).mock.calls[1][1] as {p_key:string};expect(first.p_key).toBe(second.p_key);
 jest.mocked(getStaffIdentity).mockResolvedValue({...actor,id:'00000000-0000-4000-8000-000000000863'});await POST(request());
 const third=jest.mocked(supabaseAdmin.rpc).mock.calls[2][1] as {p_key:string};expect(third.p_key).not.toBe(first.p_key);
 expect(supabaseAdmin.rpc).toHaveBeenCalledWith('b2b_consume_rate_limit',expect.objectContaining({p_limit:60,p_seconds:900}));
 jest.clearAllMocks();jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:false,error:null} as never);const blocked=request(),reader=jest.spyOn(blocked.body!,'getReader');expect((await POST(blocked)).status).toBe(429);expect(reader).not.toHaveBeenCalled();noStorageWrite();
 jest.mocked(supabaseAdmin.rpc).mockResolvedValue({data:null,error:{message:'PRIVATE RATE DETAIL'}} as never);const unavailable=await POST(request());expect(unavailable.status).toBe(503);expect(JSON.stringify(await unavailable.json())).not.toContain('PRIVATE RATE DETAIL');noStorageWrite();
});

test.each(['empty','string','duplicate','extra'])('multipart %s shape rejects before storage',async shape=>{
 const data=new FormData();if(shape==='string')data.append('file','this is not a File');else if(shape!=='empty'){data.append('file',file());if(shape==='duplicate')data.append('file',file());if(shape==='extra')data.append('bucket','private-bucket');}
 expect((await POST(request(data))).status).toBe(400);noStorageWrite();
});

test('bad content type, malformed multipart and missing body produce safe client errors',async()=>{
 const plain=new Request(app+'/api/upload',{method:'POST',headers:{Origin:app,'Content-Type':'application/json'},body:'{}'});expect((await POST(plain)).status).toBe(415);
 const malformed=new Request(app+'/api/upload',{method:'POST',headers:{Origin:app,'Content-Type':'multipart/form-data; boundary=fixture-upload'},body:'not multipart'});expect((await POST(malformed)).status).toBe(400);
 const missing=new Request(app+'/api/upload',{method:'POST',headers:{Origin:app,'Content-Type':'multipart/form-data; boundary=fixture-upload'}});expect((await POST(missing)).status).toBe(400);noStorageWrite();
});

test('oversized declared multipart length is rejected before opening the request stream',async()=>{
 const input=request(file(),{'Content-Length':String(MAX_MULTIPART_BYTES+1)}),reader=jest.spyOn(input.body!,'getReader');
 expect((await POST(input)).status).toBe(413);expect(reader).not.toHaveBeenCalled();noStorageWrite();
});

test('the actual multipart byte ceiling cancels an oversized stream even without a truthful length header',async()=>{
 const cancelled=jest.fn(),prefix=new TextEncoder().encode('--fixture-upload\r\nContent-Disposition: form-data; name="file"; filename="large.mp4"\r\nContent-Type: video/mp4\r\n\r\n'),chunk=new Uint8Array(1024*1024);let count=0;
 const stream=new ReadableStream<Uint8Array>({pull(controller){if(count++===0)controller.enqueue(prefix);else if(count<54)controller.enqueue(chunk);else controller.close();},cancel:cancelled});
 const input=streamRequest(stream,{'Content-Length':'1'});expect((await POST(input)).status).toBe(413);expect(cancelled).toHaveBeenCalled();noStorageWrite();
},30000);

test('a bounded parser returns File bytes intact and strips no other field into the upload',async()=>{
 const uploaded=await readUploadFile(request(file(jpeg(),'image/jpeg','food.jpg')));expect(uploaded).toBeInstanceOf(File);expect(uploaded.type).toBe('image/jpeg');expect(new Uint8Array(await uploaded.arrayBuffer())).toEqual(jpeg());
});

test.each([
 ['image/png',png(),'png'],['image/jpeg',jpeg(),'jpg'],['image/jpg',jpeg(),'jpg'],['image/gif',gif(),'gif'],
 ['image/webp',webp('VP8X'),'webp'],['image/webp',webp('VP8L'),'webp'],['image/webp',webp('VP8 '),'webp'],
 ['video/mp4',mp4(),'mp4'],['video/webm',webm(),'webm'],
] as const)('actual %s header is detected and stored with its matching extension %s',async(mime,bytes,extension)=>{
 expect(inspectUpload(bytes,mime,bytes.length)).toMatchObject({contentType:mime==='image/jpg'?'image/jpeg':mime,extension,type:mime.startsWith('video/')?'video':'image'});
 const response=await POST(request(file(new Uint8Array(bytes),mime,'misleading-name.svg')));expect(response.status).toBe(200);expect(bucket.upload.mock.calls[0][0]).toMatch(new RegExp('\\.'+extension+'$'));
});

test('five-megabyte image and fifty-megabyte video limits use actual validator boundaries',()=>{
 expect(inspectUpload(png(),'image/png',MAX_IMAGE_BYTES).type).toBe('image');expect(inspectUpload(mp4(),'video/mp4',MAX_VIDEO_BYTES).type).toBe('video');
 for(const [header,mime,size]of [[png(),'image/png',MAX_IMAGE_BYTES+1],[mp4(),'video/mp4',MAX_VIDEO_BYTES+1]] as const){try{inspectUpload(header,mime,size);throw new Error('accepted oversize');}catch(error){expect(error).toHaveProperty('status',413);}}
});

test('zero-byte uploads, unsupported formats and falsely claimed MIME never enter Storage',async()=>{
 for(const input of [file(new Uint8Array(),'image/png'),file(new TextEncoder().encode('<svg onload="alert(1)"/>'),'image/svg+xml'),file(new TextEncoder().encode('<html>not a PNG</html>'),'image/png'),file(jpeg(),'image/png'),file(png(),'application/octet-stream')]){
  expect([400,415]).toContain((await POST(request(input))).status);
 }
 noStorageWrite();
});

test('zero dimensions, huge pixel headers and malformed JPEG/WebP metadata fail before storage',async()=>{
 expect(inspectUpload(png(1000,2000),'image/png',33)).toMatchObject({width:1000,height:2000});expect(MAX_IMAGE_PIXELS).toBe(2000000);
 for(const [bytes,mime]of [[png(1001,2000),'image/png'],[png(0,1),'image/png'],[gif(2000,2000),'image/gif'],[webp('VP8X',2000,2000),'image/webp'],[webp('VP8L',2000,2000),'image/webp'],[webp('VP8 ',2000,2000),'image/webp'],[jpeg(2000,2000),'image/jpeg'],[new Uint8Array([255,216,255,192,255,255,1,0,1,0,1]),'image/jpeg']] as const){expect([413,415]).toContain((await POST(request(file(new Uint8Array(bytes),mime)))).status);}
 noStorageWrite();
});

test('a failed Storage upload never inserts a library row or deletes an earlier image',async()=>{
 bucket.upload.mockResolvedValue({data:null,error:{message:'PRIVATE STORAGE DETAIL'}});const response=await POST(request());expect(response.status).toBe(503);
 expect(JSON.stringify(await response.json())).not.toContain('PRIVATE STORAGE DETAIL');expect(addMediaItem).not.toHaveBeenCalled();expect(bucket.remove).not.toHaveBeenCalled();expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE STORAGE DETAIL');
});

test('a media DB failure removes only this request\'s new UUID object and never a previous product image',async()=>{
 jest.mocked(addMediaItem).mockRejectedValue(new Error('PRIVATE DB DETAIL'));const response=await POST(request());expect(response.status).toBe(503);
 const path=bucket.upload.mock.calls[0][0];expect(bucket.remove).toHaveBeenCalledTimes(1);expect(bucket.remove).toHaveBeenCalledWith([path]);expect(path).toMatch(/^uploads\/[0-9a-f-]{36}\.png$/);
 expect(JSON.stringify(await response.json())).not.toContain('PRIVATE DB DETAIL');expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE DB DETAIL');
});

test.each(['https://attacker.invalid/storage/v1/object/public/media/new.png',storage+'/storage/v1/object/public/b2b-proforma/new.pdf',storage+'/storage/v1/object/sign/media/new.png','javascript:alert(1)'])('unexpected public asset URL triggers cleanup instead of persisting %s',async url=>{
 bucket.getPublicUrl.mockReturnValue({data:{publicUrl:url}});const response=await POST(request());expect(response.status).toBe(503);expect(addMediaItem).not.toHaveBeenCalled();expect(bucket.remove).toHaveBeenCalledWith([bucket.upload.mock.calls[0][0]]);expect(JSON.stringify(await response.json())).not.toContain(url);
});

test('cleanup failure remains a safe failure and does not expose provider credentials',async()=>{
 jest.mocked(addMediaItem).mockRejectedValue(new Error('PRIVATE INSERT'));bucket.remove.mockRejectedValue(new Error('PRIVATE CLEANUP TOKEN'));const response=await POST(request());expect(response.status).toBe(503);
 expect(JSON.stringify(await response.json())).not.toMatch(/PRIVATE|TOKEN/);expect(bucket.remove).toHaveBeenCalledTimes(1);expect(JSON.stringify(log.mock.calls)).not.toMatch(/PRIVATE|TOKEN/);
});
