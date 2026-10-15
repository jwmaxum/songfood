import {addMediaItem} from '@/lib/media-db';
import {opsStaff} from '@/lib/operations/repository';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {ApiError,failure,json,rateLimit} from '@/lib/request-security';
import {readUploadFile} from '@/lib/uploads/request';
import {inspectUpload} from '@/lib/uploads/validation';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const actor = await opsStaff(request,['admin','product_staff']);
    await rateLimit(request,'media-upload',60,900,actor.id);
    const file = await readUploadFile(request);
    const header = new Uint8Array(await file.slice(0,262144).arrayBuffer());
    const meta = inspectUpload(header,file.type,file.size);
    // Never overwrite an existing object; old products and cached catalogues retain their image.
    const objectPath = 'uploads/' + crypto.randomUUID() + '.' + meta.extension;
    const bucket = supabaseAdmin.storage.from('media');
    const uploaded = await bucket.upload(objectPath,file,{contentType:meta.contentType,upsert:false,cacheControl:'31536000'});
    if (uploaded.error) throw new ApiError(503,'파일 저장에 실패했습니다. 다시 시도해 주세요.');
    try {
      const publicUrl = bucket.getPublicUrl(objectPath).data.publicUrl;
      const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
      const url = new URL(publicUrl);
      if (url.username || url.password || url.hash || url.search || url.origin !== base.origin || !url.pathname.startsWith('/storage/v1/object/public/media/')) throw new Error('Unexpected media URL');
      const item = await addMediaItem({name:file.name.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,200) || '업로드 파일',url:publicUrl,type:meta.type,size:(file.size/(1024*1024)).toFixed(2)+' MB'});
      return json({success:true,data:item});
    } catch {
      // If library insertion fails, remove only this request's new object, never previous images.
      try { await bucket.remove([objectPath]); } catch { /* A lost cleanup response must not expose credentials or provider errors. */ }
      throw new ApiError(503,'미디어 DB 등록에 실패했습니다. 파일을 다시 업로드해 주세요.');
    }
  } catch (error) { return failure(error); }
}
