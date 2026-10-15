import {ApiError,failure,json,readJson,textField} from '@/lib/request-security';
import {opsStaff} from '@/lib/operations/repository';
import {NextRequest} from 'next/server';
import {getMediaItems,addMediaItem,deleteMediaItem} from '@/lib/media-db';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    await opsStaff(request,['admin','product_staff']);
    const value = new URL(request.url).searchParams.get('type');
    if (value && !['image','video'].includes(value)) throw new ApiError(400,'미디어 종류를 확인해 주세요.');
    const items = await getMediaItems((value || undefined) as 'image'|'video'|undefined);
    return json({success:true,data:items.map(item=>({id:item.id,name:item.name,url:item.url,type:item.type,size:item.size,created_at:item.created_at}))});
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    await opsStaff(request,['admin','product_staff']);
    const body = await readJson(request,8192);
    if (Object.keys(body).some(k=>!['name','url','type','size'].includes(k))) throw new ApiError(400,'미디어 입력 항목을 확인해 주세요.');
    const name = textField(body.name,'파일명',200), value = textField(body.url,'파일 주소',2048);
    let url: URL; try { url = new URL(value); } catch { throw new ApiError(400,'HTTPS 파일 주소를 확인해 주세요.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new ApiError(400,'HTTPS 파일 주소를 확인해 주세요.');
    if (body.type !== undefined && (typeof body.type !== 'string' || !['image','video'].includes(body.type))) throw new ApiError(400,'미디어 종류를 확인해 주세요.');
    const type = body.type === 'video' ? 'video' : 'image';
    const item = await addMediaItem({name,url:url.toString(),type,size:body.size === undefined ? 'External URL' : textField(body.size,'파일 크기',40)});
    return json({success:true,data:item});
  } catch (error) { return failure(error); }
}
export async function DELETE(request: NextRequest) {
  try {
    await opsStaff(request,['admin','product_staff']);
    const id = textField(new URL(request.url).searchParams.get('id'),'미디어 ID',100);
    // Only the library entry is removed. Shared product/content references retain the object.
    return json({success:await deleteMediaItem(id)});
  } catch (error) { return failure(error); }
}
