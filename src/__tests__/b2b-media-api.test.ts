import {GET,POST,DELETE} from '@/app/api/media/route';
import {getStaffIdentity} from '@/lib/admin-auth';
import {getMediaItems,addMediaItem,deleteMediaItem} from '@/lib/media-db';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {NextRequest} from 'next/server';

jest.mock('@/lib/admin-auth',()=>({getStaffIdentity:jest.fn()}));
jest.mock('@/lib/media-db',()=>({getMediaItems:jest.fn(),addMediaItem:jest.fn(),deleteMediaItem:jest.fn()}));
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{rpc:jest.fn(),storage:{from:jest.fn()}},isAuthConfigured:()=>true,isSupabaseConfigured:()=>true}));
const origin='https://shop.example';
const actor={id:'00000000-0000-4000-8000-000000000871',email:'media@example.invalid',role:'admin' as const};
const id='00000000-0000-4000-8000-000000000872';
const media={id,name:'Food photo',url:'https://project.supabase.co/storage/v1/object/public/media/uploads/photo.png',type:'image' as const,size:'0.12 MB',created_at:'2026-10-15T05:00:00Z'};
const savedOrigin=process.env.NEXT_PUBLIC_APP_URL;
const valid={name:'Legacy public image',url:'https://cdn.example.invalid/food.png',type:'image'};
let logger:jest.SpyInstance;
function post(data:unknown=valid,requestOrigin=origin){return new Request(origin+'/api/media',{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json'},body:JSON.stringify(data)});}
function remove(query='?id='+id,requestOrigin=origin){return new NextRequest(origin+'/api/media'+query,{method:'DELETE',headers:{Origin:requestOrigin}});}
function noCmsAccess(){expect(getMediaItems).not.toHaveBeenCalled();expect(addMediaItem).not.toHaveBeenCalled();expect(deleteMediaItem).not.toHaveBeenCalled();}
beforeEach(()=>{
 jest.clearAllMocks();process.env.NEXT_PUBLIC_APP_URL=origin;jest.mocked(getStaffIdentity).mockResolvedValue(actor);
 jest.mocked(getMediaItems).mockResolvedValue([media]);jest.mocked(addMediaItem).mockImplementation(async value=>({...value,id,created_at:media.created_at}));jest.mocked(deleteMediaItem).mockResolvedValue(true);
 logger=jest.spyOn(console,'error').mockImplementation(()=>undefined);
});
afterEach(()=>logger.mockRestore());
afterAll(()=>{if(savedOrigin===undefined)delete process.env.NEXT_PUBLIC_APP_URL;else process.env.NEXT_PUBLIC_APP_URL=savedOrigin;});

test.each(['admin','product_staff'] as const)('%s may read only the six library fields while unknown internal fields stay private',async role=>{
 jest.mocked(getStaffIdentity).mockResolvedValue({...actor,role});jest.mocked(getMediaItems).mockResolvedValue([{...media,source_notes:'PRIVATE MEDIA SOURCE',created_by:'PRIVATE ACTOR',storage_secret:'PRIVATE STORAGE'}] as unknown as Awaited<ReturnType<typeof getMediaItems>>);
 const response=await GET(new Request(origin+'/api/media?mode=admin&type=image'));expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
 const body=await response.json();expect(body).toEqual({success:true,data:[media]});expect(Object.keys(body.data[0]).sort()).toEqual(['id','name','url','type','size','created_at'].sort());expect(JSON.stringify(body)).not.toContain('PRIVATE');
 expect(getMediaItems).toHaveBeenCalledWith('image');
});

test.each([null,{...actor,role:'customer'},{...actor,role:'inquiry_staff'},{...actor,role:'order_staff'}])('anonymous or unrelated identities cannot list, register or remove media %j',async identity=>{
 jest.mocked(getStaffIdentity).mockResolvedValue(identity as Awaited<ReturnType<typeof getStaffIdentity>>);
 expect((await GET(new Request(origin+'/api/media'))).status).toBe(403);expect((await POST(post())).status).toBe(403);expect((await DELETE(remove())).status).toBe(403);noCmsAccess();
});

test.each([['',undefined],['?type=image','image'],['?type=video','video']])('validated list filter %s is forwarded without reading arbitrary metadata',async(query,type)=>{
 expect((await GET(new Request(origin+'/api/media'+query))).status).toBe(200);expect(getMediaItems).toHaveBeenCalledWith(type);
});

test('invalid library media types fail before data access',async()=>{
 for(const value of ['audio','IMAGE','image,video'])expect((await GET(new Request(origin+'/api/media?type='+encodeURIComponent(value)))).status).toBe(400);noCmsAccess();
});

test('foreign origins cannot register or delete with a valid current staff session',async()=>{
 expect((await POST(post(valid,'https://foreign.invalid'))).status).toBe(403);expect((await DELETE(remove('?id='+id,'https://foreign.invalid'))).status).toBe(403);expect(getStaffIdentity).not.toHaveBeenCalled();noCmsAccess();
});

test('legacy HTTPS references are registered without an external fetch or a Storage write',async()=>{
 const response=await POST(post({...valid,url:'https://cdn.example.invalid/food%20photo.png?version=2',type:'video',size:'External video'}));expect(response.status).toBe(200);
 expect(addMediaItem).toHaveBeenCalledWith({name:valid.name,url:'https://cdn.example.invalid/food%20photo.png?version=2',type:'video',size:'External video'});expect(supabaseAdmin.storage.from).not.toHaveBeenCalled();
});

test.each([
 {url:'http://cdn.example.invalid/photo.jpg'},{url:'//cdn.example.invalid/photo.jpg'},{url:'/images/photo.jpg'},
 {url:'javascript:alert(1)'},{url:'data:image/svg+xml,<svg/>'},{url:'https://user:password@cdn.example.invalid/photo.jpg'},
 {url:'not a URL'},{name:''},{name:'a'.repeat(201)},{size:10},{size:'a'.repeat(41)},
 {type:'audio'},{type:['image']},{type:['video']},{actor_id:actor.id},{source_notes:'PRIVATE'},
])('unsafe legacy metadata is rejected before registration %j',async patch=>{
 expect((await POST(post({...valid,...patch}))).status).toBe(400);expect(addMediaItem).not.toHaveBeenCalled();expect(supabaseAdmin.storage.from).not.toHaveBeenCalled();
});

test('legacy reference defaults remain image plus External URL without inventing other fields',async()=>{
 const response=await POST(post({name:' Legacy photo ',url:' https://cdn.example.invalid/photo.jpg '}));expect(response.status).toBe(200);expect(addMediaItem).toHaveBeenCalledWith({name:'Legacy photo',url:'https://cdn.example.invalid/photo.jpg',type:'image',size:'External URL'});
});

test('malformed JSON, wrong content type and an oversized legacy body never write metadata',async()=>{
 const base={method:'POST',headers:{Origin:origin,'Content-Type':'application/json'}};
 expect((await POST(new Request(origin+'/api/media',{...base,body:'{'}))).status).toBe(400);
 expect((await POST(new Request(origin+'/api/media',{...base,headers:{Origin:origin,'Content-Type':'text/plain'},body:'{}'}))).status).toBe(415);
 expect((await POST(post({...valid,url:'https://cdn.example.invalid/'+ 'x'.repeat(9000)}))).status).toBe(413);expect(addMediaItem).not.toHaveBeenCalled();
});

test('deleting a library entry preserves the shared Storage object used by other pages and products',async()=>{
 const response=await DELETE(remove());expect(response.status).toBe(200);expect(await response.json()).toEqual({success:true});expect(deleteMediaItem).toHaveBeenCalledWith(id);expect(supabaseAdmin.storage.from).not.toHaveBeenCalled();
});

test('missing or oversized delete identifiers are rejected without a database or Storage write',async()=>{
 expect((await DELETE(remove(''))).status).toBe(400);expect((await DELETE(remove('?id='+ 'x'.repeat(101)))).status).toBe(400);expect(deleteMediaItem).not.toHaveBeenCalled();expect(supabaseAdmin.storage.from).not.toHaveBeenCalled();
});

test('provider errors in list, legacy registration or removal return safe errors without leaked details',async()=>{
 jest.mocked(getMediaItems).mockRejectedValue(new Error('PRIVATE LIST DETAIL'));jest.mocked(addMediaItem).mockRejectedValue(new Error('PRIVATE INSERT DETAIL'));jest.mocked(deleteMediaItem).mockRejectedValue(new Error('PRIVATE DELETE DETAIL'));
 for(const response of [await GET(new Request(origin+'/api/media')),await POST(post()),await DELETE(remove())]){expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain('PRIVATE');}
 expect(JSON.stringify(logger.mock.calls)).not.toContain('PRIVATE');
});
