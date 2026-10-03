import { getStaffIdentity, requireStaff } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { auth: { getUser: jest.fn() }, from: jest.fn() },
}));

const getUser = supabaseAdmin.auth.getUser as jest.Mock;
const from = supabaseAdmin.from as jest.Mock;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

beforeEach(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  jest.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'staff@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' } }, error: null });
  from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'product_staff', status: 'active' }, error: null }) }) }) });
});

afterAll(() => { process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey; });

test('anonymous product writes are denied before reaching the database', async () => {
  const denied = await requireStaff(new Request('https://site.example/api/products', { method: 'POST' }), ['admin', 'product_staff']);
  expect(denied?.status).toBe(403);
  expect(getUser).not.toHaveBeenCalled();
});

test('active product staff token can write products', async () => {
  const request = new Request('https://site.example/api/products', { method: 'POST', headers: { Authorization: 'Bearer valid-token' } });
  expect(await requireStaff(request, ['admin', 'product_staff'])).toBeNull();
  expect(getUser).toHaveBeenCalledWith('valid-token');
});

test('a different role cannot write products', async () => {
  expect((await requireStaff(new Request('https://site.example/api/products', { headers: { Authorization: 'Bearer valid-token' } }), ['admin']))?.status).toBe(403);
});

test('suspended staff cannot authenticate', async () => {
  from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'admin', status: 'suspended' }, error: null }) }) }) });
  expect(await getStaffIdentity(new Request('https://site.example/api/products', { headers: { Authorization: 'Bearer valid-token' } }))).toBeNull();
});

test('cross-origin cookie writes are denied', async () => {
  const denied = await requireStaff(new Request('https://site.example/api/products', { method: 'POST', headers: { Origin: 'https://evil.example', Cookie: 'sf_admin_access=valid-token' } }), ['admin', 'product_staff']);
  expect(denied?.status).toBe(403);
  expect(getUser).not.toHaveBeenCalled();
});
