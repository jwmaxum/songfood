import {test,expect,type Page,type BrowserContext} from '@playwright/test';
import {installMediaUploadProxy} from './media-upload-test-helpers';

async function isolate(page:Page){await page.route('**/*',route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());}
async function signIn(context:BrowserContext){await context.addCookies([{name:'sf_admin_access',value:'a'.repeat(64),url:'http://127.0.0.1:3100',httpOnly:true,sameSite:'Strict'}]);}
async function choosePhoto(page:Page,label:string){
 const base64=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=80;canvas.height=60;const c=canvas.getContext('2d')!;c.fillStyle='#14532d';c.fillRect(0,0,80,60);return canvas.toDataURL('image/png').split(',')[1];});
 const field=page.getByRole('region',{name:label,exact:true});
 await field.getByLabel(label+' 파일 선택',{exact:true}).setInputFiles({name:'qa-cms-photo.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});
 await expect(field).toContainText('업로드 완료');
 const url=await field.locator('input[readonly]').inputValue();expect(url).toMatch(/\/storage\/v1\/object\/public\/media\//);return url;
}
test.beforeEach(async({page,context,request})=>{await request.post('http://127.0.0.1:4011/__reset');await signIn(context);await isolate(page);await installMediaUploadProxy(page);});
test.afterEach(async({request})=>{const state=await(await request.get('http://127.0.0.1:4011/__state')).json();expect(state.unknown).toEqual([]);expect(state.emails).toEqual([]);expect(state.documentEmails).toEqual([]);expect(state.records).toEqual([]);});

test('hero image files save through the existing slide action and survive a reload',async({page,context})=>{
 await page.goto('/admin/hero');await page.getByRole('button',{name:'ADD HERO SLIDE',exact:true}).click();
 await page.getByRole('combobox').selectOption('image');await page.getByPlaceholder('Headline overlay...').fill('QA uploaded hero image');
 const url=await choosePhoto(page,'히어로 이미지');
 expect((await(await context.request.get('/api/hero?mode=admin')).json()).data).toEqual([]);
 await page.getByRole('button',{name:'Save Hero Slide',exact:true}).click();await expect(page.getByText('New hero slide created')).toBeVisible();
 await page.reload();await expect(page.getByText('QA uploaded hero image',{exact:true})).toBeVisible();
 expect((await(await context.request.get('/api/hero?mode=admin')).json()).data[0]).toMatchObject({title:'QA uploaded hero image',media_url:url,media_type:'image'});
 expect(await page.locator('img').evaluateAll((images,url)=>images.some(image=>(image as HTMLImageElement).src===url),url)).toBe(true);
});

test('journal cover files persist and the upload library is reused without a second upload',async({page,context})=>{
 await page.goto('/admin/journal');await page.getByRole('button',{name:'CREATE ARTICLE',exact:true}).click();
 await page.getByPlaceholder('Article Headline...').fill('QA uploaded journal cover');const url=await choosePhoto(page,'저널 표지 이미지');
 await page.getByRole('button',{name:'Save Article',exact:true}).click();await expect(page.getByText('New article created')).toBeVisible();
 await page.reload();await expect(page.getByText('QA uploaded journal cover',{exact:true})).toBeVisible();
 expect((await(await context.request.get('/api/journal?mode=admin')).json()).data[0].cover_image).toBe(url);
 const media=await(await context.request.get('/api/media?mode=admin&type=image')).json();expect(media.data).toHaveLength(1);expect(new URL(media.data[0].url).pathname).toBe(new URL(url).pathname);
});

test('menu image creation and replacement save only on their explicit menu actions',async({page,context})=>{
 await page.goto('/admin/navigation');await page.getByRole('button',{name:'ADD DEPTH 1 MENU',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Title / Label',{exact:true}).fill('QA image menu');await dialog.getByLabel('메뉴 목적지',{exact:true}).selectOption('custom');await dialog.getByLabel('URL / Route Path',{exact:true}).fill('/contact');
 const first=await choosePhoto(page,'메뉴 이미지');await dialog.getByRole('button',{name:'Create Menu',exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.reload();await page.getByRole('button',{name:'QA image menu 이미지 수정',exact:true}).click();
 const editor=page.getByRole('dialog');const second=await choosePhoto(page,'메뉴 이미지');expect(second).not.toBe(first);
 let rows=(await(await context.request.get('/api/menus?mode=admin')).json()).data;expect(rows[0].image_url).toBe(first);
 await editor.getByRole('button',{name:'메뉴 이미지 저장',exact:true}).click();await expect(editor).toHaveCount(0);await page.reload();
 rows=(await(await context.request.get('/api/menus?mode=admin')).json()).data;expect(rows[0]).toMatchObject({title:'QA image menu',url:'/contact',image_url:second});
 await page.goto('/?lang=ko');expect(await page.locator('img').evaluateAll((images,url)=>images.some(image=>(image as HTMLImageElement).src===url),second)).toBe(true);
});

test('shared image settings reload saved CMS selection and explicit clearing restores the default logo',async({page,context})=>{
 const logo='https://qa-image-project.supabase.co/storage/v1/object/public/media/qa-logo.png';
 const stored=await context.request.post('/api/content-blocks',{headers:{Origin:'http://127.0.0.1:3100'},data:{section_key:'branding_logo',page:'branding',title:'공통 로고',media_url:logo,media_type:'image'}});expect(stored.ok()).toBe(true);
 await page.goto('/admin/media#site-images');const field=page.getByRole('region',{name:'공통 로고',exact:true});
 await expect(field.locator('input[readonly]')).toHaveValue(logo);await page.reload();await expect(field.locator('input[readonly]')).toHaveValue(logo);
 // The HTTP stand-in is not a production-approved Supabase HTTPS origin. Keep that gate closed.
 const before=await context.request.get('/logo.png',{maxRedirects:0});expect(before.status()).toBe(302);expect(before.headers().location).toBe('/images/site/default-logo.png');
 await field.getByRole('button',{name:'공통 로고 제외',exact:true}).click();await page.getByRole('button',{name:'공통 로고 이미지 저장',exact:true}).click();await expect(page.getByText('공통 로고 이미지를 저장했습니다.',{exact:true})).toBeVisible();
 await page.reload();const settings=(await(await context.request.get('/api/content-blocks')).json()).data;expect(settings.find((row:{section_key:string})=>row.section_key==='branding_logo').media_url).toBe('');
 const cleared=await context.request.get('/logo.png',{maxRedirects:0});expect(cleared.headers().location).toBe('/images/site/default-logo.png');
});

test('content block image files save from the real manager and survive a reload',async({page,context})=>{
 await page.goto('/admin/content-blocks');await page.getByRole('button',{name:'ADD CONTENT BLOCK',exact:true}).click();
 await page.getByPlaceholder('e.g. brand_story',{exact:true}).fill('qa_image_block');await page.getByPlaceholder('Section main title...',{exact:true}).fill('QA uploaded content block');
 const url=await choosePhoto(page,'콘텐츠 이미지');
 const before=(await(await context.request.get('/api/content-blocks')).json()).data;expect(before.some((row:{section_key:string})=>row.section_key==='qa_image_block')).toBe(false);
 await page.getByRole('button',{name:'Save Content Block',exact:true}).click();await expect(page.getByText('New block created',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'QA uploaded content block',exact:true})).toBeVisible();await expect(page.getByRole('img',{name:'QA uploaded content block',exact:true})).toHaveAttribute('src',url);
 const rows=(await(await context.request.get('/api/content-blocks')).json()).data;expect(rows.find((row:{section_key:string})=>row.section_key==='qa_image_block')).toMatchObject({title:'QA uploaded content block',media_url:url,media_type:'image'});
});
