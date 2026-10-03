import { publicProduct } from '@/lib/public-product';
import { pageRoles } from '@/lib/staff-permissions';
import type { ProductItem } from '@/lib/types';
test('public DTO strips all prices, stock and unexpected internal fields',()=>{
  const input={id:'p',name:'Kimchi',price:11000,wholesale_price_krw:10000,export_price_usd:7,
    wholesale_discount_rate:0.15,stock:22,internal_cost:4000,supplier_secret:'secret'} as unknown as ProductItem;
  expect(publicProduct(input)).toEqual({id:'p',name:'Kimchi'});
});
test('all privileged page groups match their intended roles',()=>{
  expect(pageRoles('/admin/companies')).toEqual(['admin']);
  expect(pageRoles('/admin/users')).toEqual(['admin']);
  expect(pageRoles('/admin/crm')).not.toContain('product_staff');
  expect(pageRoles('/admin/products')).not.toContain('inquiry_staff');
  expect(pageRoles('/admin/labels/audit')).toContain('product_staff');
  expect(pageRoles('/admin/orders')).toContain('order_staff');
  expect(pageRoles('/admin/payments')).toEqual(['admin']);
  expect(pageRoles('/admin/unknown')).toEqual(['admin']);
});
