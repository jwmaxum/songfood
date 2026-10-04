import {crmStaff,crmFailure,databaseError} from '@/lib/crm/repository';
import {previewPi,piAdmin,piDetail,issuePi,resumePi,documentById} from '@/lib/pi/repository';
import {savePiSettings} from '@/lib/pi/settings';
import {supabaseAdmin} from '@/lib/supabase-admin';
import {ApiError,json,readJson,uuidField} from '@/lib/request-security';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){try{const staff=await crmStaff(request);return json(await piDetail(uuidField((await params).id),staff.role==='admin'));}catch(e){return crmFailure(e);}}
export async function POST(request:Request,{params}:Context){try{
 const staff=await piAdmin(request),id=uuidField((await params).id),body=await readJson(request,32768);
 if(body.action==='preview')return json({snapshot:await previewPi(id,body)});
 if(body.action==='settings'){
  return json({success:true,settings:await savePiSettings(request,staff.id,{revision:body.settings_revision,seller:body.seller})});
 }
 if(body.action==='resume'||body.action==='cancel'){
  const doc=await documentById(uuidField(body.document_id));if(doc.inquiry_id!==id)throw new ApiError(404,'PI를 찾을 수 없습니다.');
  if(body.action==='resume')return json({success:true,document:await resumePi(request,staff.id,doc.id)});
  if(doc.status!=='preparing')throw new ApiError(409,'미발행 준비 문서만 취소할 수 있습니다.');
  const r=await supabaseAdmin.rpc('b2b_pi_finish',{p_actor:staff.id,p_id:doc.id,p_path:null,p_sha:null,p_bytes:null,p_cancel:true});databaseError(r.error);return json({success:true,document:r.data});
 }
 if(body.action!=='issue')throw new ApiError(400,'작업을 확인해 주세요.');
 return json({success:true,document:await issuePi(request,staff.id,id,body)},201);
 }catch(e){return crmFailure(e);}
}
