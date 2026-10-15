import {filterProducts,readFilters,storageGroup} from '@/lib/storefront';
import type {ProductItem} from '@/lib/types';

const ambientRegistrations=[
 {id:'prod-sau-doenjang-1k',storage:'실온 보관, 개봉 후 냉장보관'},
 {id:'prod-sau-ssamjang-500',storage:'실온 보관, 개봉 후 냉장보관'},
 {id:'prod-sau-bulgogi-marin',storage:'실온 보관, 개봉 후 냉장보관'},
 {id:'prod-sau-chicken-sweet',storage:'실온 보관, 개봉 후 냉장보관'},
 {id:'prod-bev-honey-yuja',storage:'실온 보관, 개봉 후 뚜껑을 닫아 냉장보관'},
];

test('five actual room-temperature registrations are not classified by their after-opening refrigeration text',()=>{
 for(const product of ambientRegistrations)expect({id:product.id,group:storageGroup(product.storage)}).toEqual({id:product.id,group:'ambient'});
});
test('cool/dry-only unopened text remains unknown and does not imply room temperature',()=>{
 expect(storageGroup('직사광선을 피해 서늘한 곳 보관, 개봉 후 냉장보관')).toBe('unknown');
 expect(storageGroup('Store in a cool dry place. After opening refrigerate.')).toBe('unknown');
});
test.each([
 ['Store at room temperature; AFTER   OPENING refrigerate.','ambient'],
 ['Keep ambient. Once\tOpened, keep refrigerated.','ambient'],
 ['냉장 보관, 개봉후 냉동 가능','chilled'],
])('explicit after-opening markers handle case and spacing: %s',(value,expected)=>{
 expect(storageGroup(value)).toBe(expected);
});
test.each([
 '개봉 후 냉장보관',
 'After opening keep frozen.',
 'Once opened, refrigerate.',
])('after-opening-only instructions provide no unopened storage fact: %s',value=>{
 expect(storageGroup(value)).toBe('unknown');
});
test('ordinary storage descriptions and existing mixed-before-marker priority remain unchanged',()=>{
 for(const [value,expected]of [
  ['-18℃ 이하 냉동 보관','frozen'],['0~4℃ 냉장보관 (Keep Refrigerated)','chilled'],
  ['room temperature','ambient'],['냉장 또는 냉동 보관','frozen'],
  ['냉장 또는 냉동 보관, 개봉 후 냉장보관','frozen'],
 ])expect(storageGroup(value)).toBe(expected);
 expect(storageGroup()).toBe('unknown');
});
test('catalogue filters separate ambient condiments from chilled products without mutating registered text',()=>{
 const rows=[
  ...ambientRegistrations,
  {id:'chilled',storage:'0~4℃ 냉장보관'},
  {id:'frozen',storage:'-18℃ 이하 냉동 보관'},
  {id:'cool-unconfirmed',storage:'서늘한 곳 보관, 개봉 후 냉장보관'},
 ] as ProductItem[];
 const before=JSON.stringify(rows);
 const select=(storage:string)=>filterProducts(rows,readFilters(new URLSearchParams({storage}))).map(product=>product.id);
 expect(select('ambient')).toEqual(ambientRegistrations.map(product=>product.id));
 expect(select('chilled')).toEqual(['chilled']);
 expect(select('frozen')).toEqual(['frozen']);
 expect(select('unknown')).toEqual(['cool-unconfirmed']);
 expect(JSON.stringify(rows)).toBe(before);
});
