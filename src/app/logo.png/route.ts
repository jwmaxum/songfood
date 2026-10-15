import {getSiteImages} from '@/lib/site-images-server';
import {storedMediaImageAddress} from '@/lib/media-image-url';
export const dynamic='force-dynamic';
export async function GET(){
 const images=await getSiteImages();
 const location=storedMediaImageAddress(images.logo)||'/images/site/default-logo.png';
 return new Response(null,{status:302,headers:{Location:location,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
