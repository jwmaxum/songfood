import {catalogueHref,readCatalogueParams,safeCatalogueReturn,productHref,productAnchor,catalogueSelectionValid} from '@/lib/catalogue-navigation';
describe('catalogue URL authority and compatibility',()=>{
 test('known legacy collections and cold storage become real current filters',()=>{
  expect(readCatalogueParams('cat=fresh').get('storage')).toBe('frozen');
  expect(readCatalogueParams('cat=fresh').has('cat')).toBe(false);
  for(const [old,current]of [['pantry','K-간편식/HMR'],['sauce','K-소스/장류'],['dairy','K-주류/전통주']])expect(readCatalogueParams('cat='+old).get('collection')).toBe(current);
  for(const value of ['traditional','snack','deals','garbage'])expect(readCatalogueParams('cat='+value).get('cat')).toBe(value);
  expect(readCatalogueParams('cat=fresh&collection=K-김치/발효식품').get('storage')).toBeNull();
 });
 test('category dependence, unsafe keys and optional conditions are explicit',()=>{
  const result=new URL(catalogueHref('collection=K-만두/냉동식품&category=만두 & 교자&mode=export&lang=en&actor=admin',{collection:'K-소스/장류',page:'1'}),'https://songfood.invalid');
  expect(result.searchParams.get('category')).toBeNull();expect(result.searchParams.get('actor')).toBeNull();expect(result.searchParams.get('mode')).toBe('export');
  expect(catalogueHref('cat=unknown',{collection:'',category:''})).toBe('/shop');
  expect(readCatalogueParams('page=NaN&mode=oops&lang=zz&view=oops&sort=oops').toString()).toBe('page=1');
  expect(readCatalogueParams('q='+encodeURIComponent('a'.repeat(230))).get('q')).toHaveLength(200);
 });
 test('only internal bounded catalogue destinations and safe product fragments survive',()=>{
  for(const raw of ['https://evil.test/shop','//evil.test/shop','/shop/../admin','/admin','/shopper','/shop\\evil','/shop?x=%5c%5cevil','/shop?x=%0Aevil','/shop?x=%E0%A4%A','/shop?'+ 'x'.repeat(2401)])expect(safeCatalogueReturn(raw)).toBeNull();
  expect(safeCatalogueReturn('/shop?q=mandu&mode=export&lang=en&next=https%3A%2F%2Fevil.test#product-qa-2')).toBe('/shop?q=mandu&mode=export&lang=en#product-qa-2');
  expect(safeCatalogueReturn('/collections?cat=fresh#evil')).toBe('/collections?storage=frozen');
  expect(safeCatalogueReturn('/shop?q=hello%20world')).toBe('/shop?q=hello+world');
 });
 test('detail links carry per-link search context rather than global history',()=>{
  const href=productHref('qa-2','/shop?q=mandu&page=2&view=grid&mode=export&lang=en');
  const url=new URL(href,'https://songfood.invalid');expect(url.pathname).toBe('/products/qa-2');expect(url.searchParams.get('mode')).toBe('export');expect(url.searchParams.get('lang')).toBe('en');
  expect(url.searchParams.get('returnTo')).toBe('/shop?q=mandu&mode=export&lang=en&page=2&view=grid');
  expect(productAnchor('qa-2')).toBe('product-qa-2');
  expect(catalogueSelectionValid(readCatalogueParams('cat=unknown'))).toBe(false);
  expect(catalogueSelectionValid(readCatalogueParams('collection=deleted'))).toBe(false);
  expect(catalogueSelectionValid(readCatalogueParams('collection=K-소스/장류&category=라면'))).toBe(false);
 });
});
