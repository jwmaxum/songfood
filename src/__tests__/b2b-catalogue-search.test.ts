import {readFilters,filterProducts,sortProducts} from '@/lib/storefront';
import type {ProductItem} from '@/lib/types';
const data=[
 {id:'b',sku:'KFD-BIBIGO-01',name:'비비고 수제 왕교자 만두',name_en:'Bibigo Premium Pork Mandu',collection:'K-만두/냉동식품',category:'만두 & 교자',storage:'Frozen',brand:'송영민푸드'},
 {id:'a',sku:'KFD-MANDU-02',name:'수제 만두',name_en:'Handmade Dumplings',collection:'K-만두/냉동식품',category:'만두 & 교자',storage:'냉동',brand:'송영민푸드 (Songfood)',is_featured:true},
 {id:'c',sku:'KFD-SAU-03',name:'간장 소스',name_en:'Soy Sauce',collection:'K-소스/장류',category:'소스 & 양념',storage:'ambient',brand:'Other'}
] as ProductItem[];
const run=(q:string)=>filterProducts(data,readFilters(new URLSearchParams(q)));
test('multiple tokens can match different fields and ignore word order/case/extra spaces',()=>{
 for(const q of ['bibigo mandu','mandu BIBIGO','  bibigo   pork  ','비비고 만두'])expect(run('q='+encodeURIComponent(q)).map(x=>x.id)).toEqual(['b']);
 expect(run('q='+encodeURIComponent('mandU 송영민푸드'))).toHaveLength(2);
 expect(run('q=bibigo+unknown')).toHaveLength(0);expect(run('q='+encodeURIComponent('[.*]'))).toHaveLength(0);
});
test('SKU compact equality and explicit food synonyms help real lookup',()=>{
 expect(run('q=KFD+BIBIGO+01').map(x=>x.id)).toEqual(['b']);
 expect(run('q=dumpling')).toHaveLength(2);expect(run('q=만두')).toHaveLength(2);
 expect(run('q='+encodeURIComponent('만두'))).toHaveLength(2);
});
test('collections and legacy aliases never silently return every product',()=>{
 expect(run('cat=fresh').map(x=>x.id)).toEqual(['b','a']);
 expect(run('cat=sauce').map(x=>x.id)).toEqual(['c']);
 for(const cat of ['unknown','traditional','snack','deals'])expect(run('cat='+cat)).toHaveLength(0);
 expect(run('collection=K-소스/장류&category=만두 %26 교자')).toHaveLength(0);
 expect(run('brand='+encodeURIComponent('송영민푸드'))).toHaveLength(2);
});
test('sorting is deterministic, relevance-aware and does not mutate the source',()=>{
 const before=data.map(p=>p.id);
 expect(sortProducts(data,'relevance','KFD-MANDU-02').map(x=>x.id)).toEqual(['a','b','c']);
 expect(sortProducts(data,'featured').map(x=>x.id)).toEqual(['a','b','c']);
 expect(sortProducts(data,'name','','en').map(x=>x.id)).toEqual(['b','a','c']);
 expect(sortProducts(data,'name-desc','','en').map(x=>x.id)).toEqual(['c','a','b']);
 expect(sortProducts(data,'sku').map(x=>x.id)).toEqual(['b','a','c']);
 expect(data.map(x=>x.id)).toEqual(before);
});

test('own-brand English search matches reviewed aliases even without English brand in product names',()=>{expect(run('q=songfood').map(p=>p.id)).toEqual(['b','a']);});
