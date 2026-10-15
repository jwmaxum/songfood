import {PATCH,POST} from '@/app/api/menus/route';
import {requireStaff} from '@/lib/admin-auth';
import {updateMenuImage,toggleMenuStatus,createMenuItem} from '@/lib/menus-db';
import {NextRequest} from 'next/server';
jest.mock('@/lib/admin-auth',()=>({requireStaff:jest.fn()}));
jest.mock('@/lib/menus-db',()=>({updateMenuImage:jest.fn(),toggleMenuStatus:jest.fn(),createMenuItem:jest.fn()}));
function request(body:unknown,method='PATCH'){return new NextRequest('https://shop.example/api/menus',{method,headers:{'Content-Type':'application/json',Origin:'https://shop.example'},body:JSON.stringify(body)});}
beforeEach(()=>{jest.clearAllMocks();jest.mocked(requireStaff).mockResolvedValue(null);jest.mocked(updateMenuImage).mockResolvedValue({id:'qa-menu',image_url:'/images/test.png'} as never);jest.mocked(toggleMenuStatus).mockResolvedValue(true);jest.mocked(createMenuItem).mockResolvedValue({id:'qa-menu'} as never);});
test('an image-only update changes only its menu identity and image field after staff authorization',async()=>{
 const response=await PATCH(request({id:'qa-menu',image_url:'/images/test.png'}));expect(response.status).toBe(200);
 expect(requireStaff).toHaveBeenCalledWith(expect.anything(),['admin','product_staff']);expect(updateMenuImage).toHaveBeenCalledWith('qa-menu','/images/test.png');expect(toggleMenuStatus).not.toHaveBeenCalled();
 expect((await response.json()).data.image_url).toBe('/images/test.png');
});
test('clear is explicit and missing records return 404',async()=>{
 expect((await PATCH(request({id:'qa-menu',image_url:''}))).status).toBe(200);expect(updateMenuImage).toHaveBeenLastCalledWith('qa-menu','');
 jest.mocked(updateMenuImage).mockResolvedValue(null);expect((await PATCH(request({id:'deleted',image_url:''}))).status).toBe(404);
});
test.each([{id:'qa-menu',image_url:'javascript:alert(1)'},{id:'qa-menu',image_url:'//foreign.example/a.png'},{id:'qa-menu',image_url:null},{id:'qa-menu',image_url:'/images/a.png',is_active:true},{id:'qa-menu',image_url:'/images/a.png',title:'overwrite'}])('unsafe image values and unrelated edits never reach the store %j',async body=>{
 expect((await PATCH(request(body))).status).toBe(400);expect(updateMenuImage).not.toHaveBeenCalled();expect(toggleMenuStatus).not.toHaveBeenCalled();
});
test('a denied identity cannot write and existing active toggles retain their original behavior',async()=>{
 jest.mocked(requireStaff).mockResolvedValue(new Response('{}',{status:403}) as never);expect((await PATCH(request({id:'qa-menu',image_url:''}))).status).toBe(403);expect(updateMenuImage).not.toHaveBeenCalled();
 jest.mocked(requireStaff).mockResolvedValue(null);expect((await PATCH(request({id:'qa-menu',is_active:false}))).status).toBe(200);expect(toggleMenuStatus).toHaveBeenCalledWith('qa-menu',false);
});
test('new menu image is saved through the existing create mechanism and malformed URL is rejected',async()=>{
 expect((await POST(request({title:'Contact',url:'/contact',image_url:'/images/new.png'},'POST'))).status).toBe(200);
 expect(createMenuItem).toHaveBeenCalledWith(expect.objectContaining({title:'Contact',image_url:'/images/new.png'}));
 jest.clearAllMocks();expect((await POST(request({title:'Contact',url:'/contact',image_url:'javascript:alert(1)'},'POST'))).status).toBe(400);expect(createMenuItem).not.toHaveBeenCalled();
});
