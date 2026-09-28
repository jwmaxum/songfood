const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const vars = Object.fromEntries(env.split(/\r?\n/).filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line)).map((line) => {
  const index = line.indexOf('=');
  return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')];
}));
const db = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);
const base = process.env.LOCAL_WORKER_URL || 'http://127.0.0.1:8787';
const created = [];

async function call(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
}
function expectStatus(result, expected) {
  if (result.status !== expected) throw new Error(`Expected HTTP ${expected}, got ${result.status}: ${JSON.stringify(result.data)}`);
}

async function run() {
  try {
    expectStatus(await call('GET', '/api/commercial-inquiries'), 403);
    expectStatus(await call('PATCH', '/api/commercial-inquiries', { id: crypto.randomUUID(), status: 'closed' }), 403);
    expectStatus(await call('POST', '/api/commercial-inquiries', { kind: 'domestic_wholesale' }), 400);
    const products = await call('GET', '/api/products');
    expectStatus(products, 200);
    const product = products.data.data[0];
    if (!product) throw new Error('No product available for export inquiry check');
    const shared = { company: 'Temporary QA Inquiry', contact_name: 'QA', email: 'qa@example.invalid' };
    for (const submission of [
      { kind: 'domestic_wholesale', ...shared, phone: '010-0000-0000', notes: 'Temporary verification row' },
      { kind: 'export_rfq', ...shared, country: 'Japan', incoterms: 'FOB Busan', items: [{ product_id: product.id, product_name: 'Client provided name', quantity_cartons: 2 }] },
    ]) {
      const result = await call('POST', '/api/commercial-inquiries', submission);
      expectStatus(result, 201);
      created.push(result.data.id);
    }
    const { data, error } = await db.from('commercial_inquiries').select('id,kind,items').in('id', created);
    if (error || data?.length !== 2 || data.find((item) => item.kind === 'export_rfq')?.items?.[0]?.product_name === 'Client provided name') {
      throw new Error(`Database verification failed: ${error?.message || 'row mismatch'}`);
    }
    console.log('Commercial inquiry smoke check passed: anonymous staff access denied, two submissions persisted');
  } finally {
    if (created.length) {
      const { error } = await db.from('commercial_inquiries').delete().in('id', created);
      if (error) throw new Error(`Temporary row cleanup failed: ${error.message}`);
    }
  }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
