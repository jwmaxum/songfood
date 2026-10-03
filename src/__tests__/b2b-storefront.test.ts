import {filterProducts,pageWindow,parseRfqLines,readFilters,safeMenuLinks,storageGroup,validQuantity} from '@/lib/storefront';
import type {ProductItem,MenuItem} from '@/lib/types';
const products=[
 {id:'a',sku:'KIM-01',name:'포기김치',name_en:'Kimchi',brand:'Song',category:'김치',storage:'냉장 0~5°C',target_markets:['Japan'],purchase_minimum:{unit:'BOX',quantity:2}},
 {id:'b',sku:'MAN-02',name:'왕만두',name_en:'Mandu',brand:'CJ',category:'만두',storage:'냉동 -18°C',target_markets:['USA'],purchase_minimum:{unit:'CTN',quantity:1}},
 {id:'c',sku:'SAU-03',name:'소스',brand:'Song',category:'소스',storage:'상온',target_markets:[]}
] as ProductItem[];
const filters=(query='')=>readFilters(new URLSearchParams(query));
test('search supports case-insensitive SKU, Korean/English names and brand',()=>{
 for(const query of ['kim-01','포기','Kimchi'])expect(filterProducts(products,filters('q='+encodeURIComponent(query))).map(p=>p.id)).toEqual(['a']);
 expect(filterProducts(products,filters('q=Song'))).toHaveLength(2);
});
test('facets combine and minimum quantities never compare different packaging units',()=>{
 expect(filterProducts(products,filters('category=김치&brand=Song&storage=chilled&market=Japan&minimum=BOX&maxMinimum=2')).map(p=>p.id)).toEqual(['a']);
 expect(filterProducts(products,filters('minimum=BOX&maxMinimum=1'))).toHaveLength(0);
 expect(filterProducts(products,filters('minimum=unknown')).map(p=>p.id)).toEqual(['c']);
 expect(filterProducts(products,filters('maxMinimum=1'))).toHaveLength(3);
 expect(filterProducts(products,filters('minimum=BOX&maxMinimum=invalid'))).toHaveLength(0);
});
test('unknown facets fail closed and empty search returns the catalogue',()=>{
 for(const query of ['category=no','brand=no','market=no','storage=no','minimum=EA'])expect(filterProducts(products,filters(query))).toHaveLength(0);
 expect(filterProducts(products,filters())).toHaveLength(3);
});
test('storage recognizes supplied descriptions without inventing temperature numbers',()=>{
 expect(storageGroup('Frozen')).toBe('frozen');expect(storageGroup('refrigerated')).toBe('chilled');
 expect(storageGroup('room temperature')).toBe('ambient');expect(storageGroup()).toBe('unknown');
});
test('paging clamps invalid/out-of-range values and preserves a stable ordered page',()=>{
 const items=Array.from({length:25},(_,i)=>i);
 expect(pageWindow(items,'2')).toMatchObject({page:2,pages:3,items:items.slice(12,24)});
 for(const value of ['-4','NaN','1.5',null])expect(pageWindow(items,value).page).toBe(1);
 expect(pageWindow(items,'999').items).toEqual([24]);expect(pageWindow([],'1')).toMatchObject({page:1,pages:1,total:0,items:[]});
});
test('RFQ persistence only restores bounded identifiers and integer carton quantities',()=>{
 expect(parseRfqLines([{product_id:'a',quantity:2,price:1,email:'private'},{product_id:'a',quantity:5},{product_id:'b',quantity:0},{product_id:'c',quantity:1.5},null,{product_id:'d',quantity:'2'},{product_id:'e'.repeat(101),quantity:2}])).toEqual([{product_id:'a',quantity:2}]);
 expect(parseRfqLines({})).toEqual([]);expect(parseRfqLines(Array.from({length:101},(_,i)=>({product_id:String(i),quantity:1})))).toHaveLength(100);
 expect(validQuantity(100000)).toBe(true);expect(validQuantity(100001)).toBe(false);
});
test('CMS secondary links cannot execute script or use network-path/admin URLs',()=>{
 const rows=['/about','javascript:alert(1)','//evil.example','/admin/users','https://example.com','/shop\\evil'].map((url,i)=>({id:String(i),url,is_active:true})) as MenuItem[];
 expect(safeMenuLinks(rows).map(m=>m.url)).toEqual(['/about']);
});
