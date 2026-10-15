import {CATALOGUE_TAXONOMY,collectionLabel,categoryLabel,productName,brandKey,brandLabel} from '@/lib/catalogue-taxonomy';
import {PRODUCT_TAXONOMY} from '@/lib/product-taxonomy';
import type {ProductItem} from '@/lib/types';

describe('customer catalogue taxonomy display',()=>{
 test('uses the canonical nine collections and twenty-one leaf values without mutation',()=>{
  expect(CATALOGUE_TAXONOMY).toEqual(PRODUCT_TAXONOMY);
  expect(CATALOGUE_TAXONOMY).toHaveLength(9);
  expect(CATALOGUE_TAXONOMY.flatMap(row=>row.categories)).toHaveLength(21);
  for(const row of PRODUCT_TAXONOMY) {
   expect(collectionLabel(row.collection,'en')).not.toMatch(/[가-힣]/);
   for(const category of row.categories) {
    expect(categoryLabel(category,'ko')).toBe(category);
    expect(categoryLabel(category,'en')).not.toMatch(/[가-힣]/);
   }
  }
 });
 test('keeps frozen-food classification separate from a storage assertion',()=>{
  expect(collectionLabel('K-만두/냉동식품','ko')).toBe('만두·냉동식품');
  expect(categoryLabel('만두 & 교자','en')).toBe('Dumplings & Gyoza');
  expect(CATALOGUE_TAXONOMY.some(row=>row.collection==='frozen')).toBe(false);
 });
 test('uses UI language for product names and falls back when no English name is registered',()=>{
  const product={name:'비비고 왕교자',name_en:'Bibigo King Dumplings'} as ProductItem;
  expect(productName(product,'en')).toBe('Bibigo King Dumplings');
  expect(productName(product,'ko')).toBe('비비고 왕교자');
  expect(productName({...product,name_en:'  '},'en')).toBe('비비고 왕교자');
 });
 test('groups only reviewed Songfood brand aliases and preserves other proper names',()=>{
  for(const name of ['송영민푸드','송영민푸드 (Songfood)','SONGFOOD','  songfood  ']) {
   expect(brandKey(name)).toBe('songfood');
   expect(brandLabel(name,'ko')).toBe('송영민푸드');
   expect(brandLabel(name,'en')).toBe('Songfood');
  }
  expect(brandKey('비비고')).not.toBe(brandKey('CJ 비비고'));
  expect(brandLabel('CJ 비비고','en')).toBe('CJ 비비고');
 });
 test('preserves unknown registered taxonomy labels rather than inventing a translation',()=>{
  expect(collectionLabel('새 분류','en')).toBe('새 분류');
  expect(categoryLabel('추가 제품종류','en')).toBe('추가 제품종류');
 });
});

test('display fallbacks use the entered language name without copying it into missing original fields',()=>{
 const product={name:null,name_en:'English-only food'};
 expect(productName(product,'ko')).toBe('English-only food');
 expect(productName(product,'en')).toBe('English-only food');
 expect(product).toEqual({name:null,name_en:'English-only food'});
 expect(productName({name:'  ',name_en:'English-only food'},'ko')).toBe('English-only food');
 expect(productName({name:null,name_en:null},'ko')).toBe('상품명 미입력');
 expect(productName({name:null,name_en:null},'en')).toBe('Unnamed product');
});
test.each([null,undefined,'','  '])('missing taxonomy %j is explicitly unclassified in both UI languages',value=>{
 expect(collectionLabel(value,'ko')).toBe('미분류');expect(categoryLabel(value,'ko')).toBe('미분류');
 expect(collectionLabel(value,'en')).toBe('Unclassified');expect(categoryLabel(value,'en')).toBe('Unclassified');
});
