import {getProducts,getPublicProducts} from '@/lib/products-db';
import {supabaseAdmin} from '@/lib/supabase-admin';
import type {ProductItem} from '@/lib/types';
jest.mock('@/lib/supabase-admin',()=>({supabaseAdmin:{from:jest.fn()},isSupabaseConfigured:()=>true}));
jest.mock('@/lib/pricing/repository',()=>({publicMinimums:async()=>({})}));
const rows=[{id:'qa-en-only',name:null,name_en:'English-only food',collection:null,category:null,sku:'AUTO-QA',source_notes:{specification:'PRIVATE'}},{id:'qa-classified',name:'분류된 식품',name_en:null,collection:'K-소스/장류',category:'장류',sku:'QA-CLASSIFIED'}] as unknown as ProductItem[];
beforeEach(()=>{jest.clearAllMocks();jest.mocked(supabaseAdmin.from).mockReturnValue({select:()=>({order:()=>({range:async()=>({data:rows,error:null})})})} as never);});
test('uncategorized nulls do not break catalogue collection filtering or English search',async()=>{
 expect((await getProducts({collection:'K-소스/장류'})).map(row=>row.id)).toEqual(['qa-classified']);
 expect((await getProducts({category:'장류'})).map(row=>row.id)).toEqual(['qa-classified']);
 expect((await getProducts({search:'English-only'})).map(row=>row.id)).toEqual(['qa-en-only']);
});
test('public catalogue preserves original name/classification nulls and excludes private source notes',async()=>{
 const product=(await getPublicProducts()).find(row=>row.id==='qa-en-only');
 expect(product).toMatchObject({name:null,name_en:'English-only food',collection:null,category:null});
 expect(product).not.toHaveProperty('source_notes');expect(rows[0].name).toBeNull();
});
