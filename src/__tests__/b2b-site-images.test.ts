import {GET} from '@/app/logo.png/route';
import {getSiteImages} from '@/lib/site-images-server';
import {projectSiteImages,SITE_IMAGE_FIELDS} from '@/lib/site-images';
import {safeImageAddress,storedMediaImageAddress} from '@/lib/media-image-url';
import {PRODUCT_COLLECTIONS} from '@/lib/product-taxonomy';
jest.mock('@/lib/site-images-server',()=>({getSiteImages:jest.fn()}));
const base='https://project.supabase.co',image=base+'/storage/v1/object/public/media/qa-photo.png';
const original=process.env.NEXT_PUBLIC_SUPABASE_URL;
beforeEach(()=>{process.env.NEXT_PUBLIC_SUPABASE_URL=base;jest.mocked(getSiteImages).mockResolvedValue({logo:'',collections:{}});});
afterAll(()=>{if(original===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=original;});
test('ten stable CMS keys project only logo and the nine canonical collection photos',()=>{
 expect(SITE_IMAGE_FIELDS).toHaveLength(10);expect(SITE_IMAGE_FIELDS.slice(1).map(field=>field.collection)).toEqual(PRODUCT_COLLECTIONS);
 const rows=SITE_IMAGE_FIELDS.map(field=>({section_key:field.key,media_url:image,source_notes:'PRIVATE'}));rows.push({section_key:'private_settings',media_url:'PRIVATE',source_notes:'PRIVATE'});
 const result=projectSiteImages(rows,base);expect(result.logo).toBe(image);expect(Object.keys(result.collections)).toHaveLength(9);expect(JSON.stringify(result)).not.toContain('PRIVATE');
});
test.each(['https://foreign.example/photo.png',base+'/storage/v1/object/sign/media/file.png',base+'/storage/v1/object/public/private/file.png',base+'/storage/v1/object/public/media/file.mp4',base+'/storage/v1/object/public/media/file.svg',base+'/storage/v1/object/public/media/file.png?token=private','/logo.png','//evil.example/logo.png','javascript:alert(1)','https://u:p@project.supabase.co/storage/v1/object/public/media/file.png',base+'/storage/v1/object/public/media/%2e%2e%2fprivate.png'])('logo redirects reject untrusted or non-image destination %s',async value=>{
 expect(storedMediaImageAddress(value,base)).toBeNull();jest.mocked(getSiteImages).mockResolvedValue({logo:value,collections:{}});
 const response=await GET();expect(response.status).toBe(302);expect(response.headers.get('location')).toBe('/images/site/default-logo.png');expect(response.headers.get('cache-control')).toBe('no-store');
});
test('the unchanged logo path follows a new uploaded image without exposing CMS rows',async()=>{
 jest.mocked(getSiteImages).mockResolvedValue({logo:image,collections:{}});const response=await GET();
 expect(response.status).toBe(302);expect(response.headers.get('location')).toBe(image);expect(response.headers.get('cache-control')).toBe('no-store');expect(await response.text()).toBe('');
});
test('clearing a photo or receiving unsafe legacy CMS data removes only the image projection',()=>{
 expect(projectSiteImages([{section_key:'branding_logo',media_url:''},{section_key:'collection_kimchi',media_url:'https://foreign.example/a.png'}],base)).toEqual({logo:'',collections:{}});
 expect(safeImageAddress('')).toBe('');expect(safeImageAddress('/images/photo.png')).toBe('/images/photo.png');expect(safeImageAddress('https://safe.example/image.jpg')).toBe('https://safe.example/image.jpg');
 for(const value of [null,42,'//evil.example/image.png','data:image/png;base64,abc','https://user:password@safe.example/a.png','/foo\\bar.png'])expect(safeImageAddress(value)).toBeNull();
});
