import { requireCustomer } from '@/lib/customer-auth';
import { revokeSession } from '@/lib/auth-session';
import { failure, json, requireSameOrigin } from '@/lib/request-security';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { return json({ success: true, ...await requireCustomer(request) }); }
  catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const response = json({ success: true });
    await revokeSession(request, response, 'customer');
    return response;
  } catch (error) { return failure(error); }
}
