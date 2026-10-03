import { customerInquiries } from '@/lib/customer-auth';
import { failure, json, uuidField } from '@/lib/request-security';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    return json({ success: true, inquiries: await customerInquiries(request, id ? uuidField(id) : undefined) });
  } catch (error) { return failure(error); }
}
