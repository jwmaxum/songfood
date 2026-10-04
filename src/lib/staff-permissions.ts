import type { StaffRole } from './admin-auth';
const ALL: StaffRole[] = ['admin','product_staff','inquiry_staff','order_staff'];
export function pageRoles(path: string): StaffRole[] {
  const section = path.split('/')[2] || '';
  if (['','account','guide','settings','history','handover','operations'].includes(section)) return ALL;
  if (['crm','documents'].includes(section)) return ['admin','inquiry_staff'];
  if (['orders'].includes(section)) return ['admin','order_staff'];
  if (['quality','releases','pricing','products','labels','hero','navigation','journal','media','media-lab','content-blocks'].includes(section)) return ['admin','product_staff'];
  return ['admin'];
}
