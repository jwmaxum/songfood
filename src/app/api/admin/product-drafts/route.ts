import {opsStaff} from '@/lib/operations/repository';
import {json,failure,readJson,ApiError,uuidField,rateLimit} from '@/lib/request-security';
import {parseDraftSave,parseDraftPublish,productId} from '@/lib/product-drafts/validation';
import {draftSnapshot,saveDraft,publishDraft} from '@/lib/product-drafts/repository';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{const actor=await opsStaff(request,['admin','product_staff']),p=new URL(request.url).searchParams;
 if([...p.keys()].some(k=>!['id','product_id'].includes(k))||(p.has('id')&&p.has('product_id')))throw new ApiError(400,'조회 조건을 확인해 주세요.');
 const id=p.has('id')?uuidField(p.get('id')):null,product=p.has('product_id')?productId(p.get('product_id')):null;
 return json(await draftSnapshot(actor.id,id,product));}catch(error){return failure(error);}
}
export async function POST(request:Request){
 try{const actor=await opsStaff(request,['admin','product_staff']);const input=parseDraftSave(await readJson(request,131072));
 await rateLimit(request,'product-draft-save',60,900,actor.id);return json({success:true,draft:await saveDraft(actor.id,input)});}catch(error){return failure(error);}
}
export async function PUT(request:Request){
 try{const actor=await opsStaff(request,['admin','product_staff']);const input=parseDraftPublish(await readJson(request,4096));
 await rateLimit(request,'product-draft-publish',20,900,actor.id);return json({success:true,...await publishDraft(actor.id,input)});}catch(error){return failure(error);}
}
