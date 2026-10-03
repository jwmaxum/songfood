import { requireStaff } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { emailField, failure, json, rateLimit, readJson, requireSameOrigin, textField } from '@/lib/request-security';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const denied = await requireStaff(request,['admin','inquiry_staff']);
  if(denied) return denied;
  try {
    const {data,error} = await supabaseAdmin.from('contact_inquiries').select('*').order('created_at',{ascending:false}).limit(200);
    if(error) throw error;
    return json({success:true,inquiries:data,unread_count:data.filter(item => item.status === 'unread').length});
  } catch(error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request); await rateLimit(request,'contact',10,3600);
    const body = await readJson(request,20_480);
    const {error} = await supabaseAdmin.from('contact_inquiries').insert({
      name:textField(body.name,'이름',120),email:emailField(body.email),message:textField(body.message,'문의 내용',10000),
      phone:textField(body.phone || '','전화번호',50,0),company:textField(body.company || '','회사명',200,0),
      subject:textField(body.subject || '일반 문의','제목',200),
    });
    if(error) throw error;
    return json({success:true,message:'문의가 접수되었습니다.'},201);
  } catch(error) { return failure(error); }
}
