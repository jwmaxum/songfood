import { parseCommercialInquiry } from '@/lib/commercial-inquiry';

const exportInquiry = {
  kind: 'export_rfq', company: 'Buyer Ltd', contact_name: 'Buyer', email: 'buyer@example.com',
  country: 'Japan', incoterms: 'FOB Busan',
  items: [{ product_id: 'prod-1', product_name: 'Product', quantity_cartons: 12 }],
};

test('export inquiry keeps requested quantities without inventing a price', () => {
  const inquiry = parseCommercialInquiry(exportInquiry);
  expect(inquiry.items).toEqual(exportInquiry.items);
  expect(inquiry).not.toHaveProperty('total_usd');
});

test('export inquiry rejects an invalid quantity or trade term', () => {
  expect(() => parseCommercialInquiry({ ...exportInquiry, items: [{ ...exportInquiry.items[0], quantity_cartons: 0 }] })).toThrow();
  expect(() => parseCommercialInquiry({ ...exportInquiry, incoterms: 'unknown' })).toThrow();
});

test('domestic wholesale inquiry requires a phone and does not trust submitted items', () => {
  expect(() => parseCommercialInquiry({ kind: 'domestic_wholesale', company: 'Shop', contact_name: 'Owner', email: 'owner@example.com' })).toThrow();
  const inquiry = parseCommercialInquiry({ kind: 'domestic_wholesale', company: 'Shop', contact_name: 'Owner', email: 'owner@example.com', phone: '010-1234-5678', items: exportInquiry.items });
  expect(inquiry.items).toEqual([]);
});
