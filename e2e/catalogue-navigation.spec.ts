import {test,expect,type Page,type BrowserContext,type Route} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function isolated(page:Page){
 await page.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
}
async function accessible(page:Page){
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
 expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
}
async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
async function signIn(context:BrowserContext){await context.addCookies([{name:'sf_admin_access',value:'a'.repeat(64),url:'http://127.0.0.1:3100',httpOnly:true,sameSite:'Strict'}]);}
const browserErrors=new WeakMap<Page,string[]>();
test.beforeEach(async({page,request})=>{
 browserErrors.set(page,[]);page.on('pageerror',error=>browserErrors.get(page)!.push(error.message));
 await request.post('http://127.0.0.1:4011/__reset');
 expect((await request.post('http://127.0.0.1:4011/__catalogue')).ok()).toBe(true);
 await isolated(page);
});
test.afterEach(async({page,request})=>{
 expect(browserErrors.get(page)||[]).toEqual([]);
 const state=await(await request.get('http://127.0.0.1:4011/__state')).json();
 expect(state.unknown).toEqual([]);expect(state.emails).toEqual([]);expect(state.records).toEqual([]);expect(state.documentEmails).toEqual([]);
});

test('legacy frozen link filters storage across food groups and ambiguous links require category choice',async({page})=>{
 await page.goto('/collections?cat=fresh&lang=en');
 await expect(page.locator('article')).toHaveCount(8);
 await expect(page.locator('article').filter({hasText:'Frozen fish cake'})).toBeVisible();
 await expect(page.locator('article').filter({hasText:'Frozen tteokbokki meal kit'})).toBeVisible();
 await expect(page.locator('article').filter({hasText:'QA soju'})).toHaveCount(0);
 for(const cat of ['traditional','deals','unknown-category']){
  await page.goto('/collections?cat='+cat+'&lang=en');
  await expect(page.locator('article')).toHaveCount(0);
  await expect(page.locator('main')).toContainText(/category.*changed|category.*available|choose.*category/i);
  const all=page.locator('main').getByRole('button',{name:'Browse all products',exact:true});
  await expect(all).toBeVisible();
 }
 await page.goto('/collections?cat=fresh&collection='+encodeURIComponent('K-주류/전통주')+'&lang=en');
 await expect(page.locator('article')).toHaveCount(1);await expect(page.locator('article')).toContainText('QA soju');
});

test('multiword and normalized SKU search find the same products while English domestic keeps English names',async({page})=>{
 await page.goto('/shop?lang=en');
 const search=page.getByLabel('Search SKU, product or brand',{exact:true});
 await search.fill('  BIBIGO   mandu  ');await page.getByRole('button',{name:'Apply filters',exact:true}).click();
 await expect(page.locator('article')).toHaveCount(4);
 await expect(page.locator('article').first()).toContainText('Bibigo mandu 1');await expect(page.locator('article').first()).not.toContainText('비비고 만두');
 await search.fill('mandu bibigo');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await expect(page.locator('article')).toHaveCount(4);
 await search.fill('nav 001');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await expect(page.locator('article')).toHaveCount(1);await expect(page.locator('article')).toContainText('NAV-001');
 await expect(page.locator('html')).toHaveAttribute('lang','en');
});

test('bilingual collection and category destinations report filtered counts and stay inside their group',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/shop?lang=en');
 const categories=page.locator('main').getByRole('navigation',{name:'Product categories',exact:true});
 await expect(categories.getByRole('link',{name:'All products 30',exact:true})).toBeVisible();
 await expect(categories.getByRole('link',{name:'Dumplings & Frozen Foods 6',exact:true})).toBeVisible();
 await categories.getByRole('link',{name:'Dumplings & Gyoza 6',exact:true}).click();
 await expect(page.locator('article')).toHaveCount(6);
 const params=new URL(page.url()).searchParams;expect(params.get('collection')).toBe('K-만두/냉동식품');expect(params.get('category')).toBe('만두 & 교자');
 await expect(page.locator('main').getByRole('navigation',{name:'Product categories'}).getByRole('link',{name:'Dumplings & Gyoza 6',exact:true})).toHaveAttribute('aria-current','page');
 const selectedUrl=new URL(page.url());selectedUrl.searchParams.set('page','999');
 await page.goto(selectedUrl.pathname+selectedUrl.search);await expect(page.locator('article')).toHaveCount(6);
 await expect.poll(()=>new URL(page.url()).searchParams.get('page')).toBe('1');
 await expect(page.locator('main').getByRole('navigation',{name:'Product pages'}).getByRole('button',{name:'1',exact:true})).toHaveAttribute('aria-current','page');
 await page.getByLabel('Language / 언어').selectOption('ko');
 await expect(page.locator('main').getByRole('navigation',{name:'상품 카테고리'}).getByRole('link',{name:'만두 & 교자 6',exact:true})).toBeVisible();
 await expect(page.locator('article').first()).toContainText('비비고 만두 1');
});

test('zero results preserve export RFQ and condition chips relax filters without losing channel or language',async({page})=>{
 const start=new URLSearchParams({q:'no-result-xyz',brand:'bibigo',storage:'frozen',mode:'export',lang:'en'});
 await page.goto('/shop?'+start);
 await expect(page.locator('article')).toHaveCount(0);
 const inquiry=page.locator('main').getByRole('link',{name:'Ask about export products · RFQ',exact:true});
 await expect(inquiry).toHaveAttribute('href','/rfq?lang=en');
 await page.locator('main').getByRole('button',{name:/Remove.*no-result-xyz/}).click();
 await expect(page.locator('article')).toHaveCount(4);
 expect(new URL(page.url()).searchParams.get('mode')).toBe('export');expect(new URL(page.url()).searchParams.get('lang')).toBe('en');
 await page.locator('main').getByRole('button',{name:/Remove.*bibigo/}).click();await expect(page.locator('article')).toHaveCount(8);
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(page.locator('article')).toHaveCount(12);expect(new URL(page.url()).searchParams.get('storage')).toBe(null);
 const shared={q:'mandu',collection:'K-만두/냉동식품',category:'만두 & 교자',view:'grid',sort:'sku',lang:'en'};
 await page.goto('/shop?'+new URLSearchParams({...shared,mode:'export',market:'Japan',page:'1'}));await expect(page.locator('article')).toHaveCount(6);
 await page.locator('main').getByRole('button',{name:'Domestic',exact:true}).click();await expect(page.locator('main').getByRole('button',{name:'Domestic',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('article')).toHaveCount(6);
 const domestic=new URL(page.url()).searchParams;for(const [key,value]of Object.entries(shared))expect(domestic.get(key)).toBe(value);
 expect(domestic.has('mode')).toBe(false);expect(domestic.has('market')).toBe(false);expect(domestic.get('page')).toBe('1');
 await page.locator('main').getByRole('button',{name:'Export RFQ · CTN',exact:true}).click();await expect(page.locator('main').getByRole('button',{name:'Export RFQ · CTN',exact:true})).toHaveAttribute('aria-pressed','true');
 const exported=new URL(page.url()).searchParams;for(const [key,value]of Object.entries(shared))expect(exported.get(key)).toBe(value);
 expect(exported.get('mode')).toBe('export');expect(exported.has('market')).toBe(false);

});

test('product new tab and return preserve the full second-page result context and location',async({page,context})=>{
 const original=new URLSearchParams({q:'QA',storage:'ambient',brand:'송영민푸드',market:'USA',minimum:'CTN',maxMinimum:'2',sort:'sku',view:'grid',page:'2',mode:'export',lang:'en'});
 await page.goto('/shop?'+original);
 await expect(page.locator('article')).toHaveCount(4);
 const card=page.locator('article').first();await expect(card).toHaveAttribute('id','product-nav-product-27');
 const href=await card.getByRole('link').filter({hasText:'QA traditional drink 27'}).getAttribute('href');expect(href).toBeTruthy();
 const tab=await context.newPage(),tabErrors:string[]=[];tab.on('pageerror',error=>tabErrors.push(error.message));await isolated(tab);await tab.goto(href!);
 await expect(tab.getByRole('navigation',{name:'Breadcrumb',exact:true})).toContainText('Drinks & Traditional Teas');
 await expect(tab.getByRole('heading',{level:1})).toHaveText('QA traditional drink 27');
 const back=tab.getByRole('link',{name:/Back to results/});const backUrl=new URL((await back.getAttribute('href'))!,page.url());
 for(const [key,value]of original)expect(backUrl.searchParams.get(key)).toBe(value);
 expect(backUrl.hash).toBe('#product-nav-product-27');
 await back.click();await expect(tab.locator('article')).toHaveCount(4);await expect(tab.locator('#product-nav-product-27')).toBeVisible();
 await expect(tab.locator('#product-nav-product-27')).toBeFocused();
 // Moving to the previous result crosses from result page 2 into page 1.
 await tab.goto(href!);
 await tab.getByRole('navigation',{name:'Navigate search results',exact:true}).getByRole('link',{name:/Previous product.*QA traditional drink 26/}).click();
 await expect(tab.getByRole('heading',{level:1})).toHaveText('QA traditional drink 26');
 const previousBack=tab.getByRole('link',{name:/Back to results/});
 const previousUrl=new URL((await previousBack.getAttribute('href'))!,tab.url());
 for(const [key,value]of original)expect(previousUrl.searchParams.get(key)).toBe(key==='page'?'1':value);
 expect(previousUrl.hash).toBe('#product-nav-product-26');
 await previousBack.click();await expect(tab.locator('article')).toHaveCount(12);
 await expect(tab.locator('#product-nav-product-26')).toBeVisible();await expect(tab.locator('#product-nav-product-26')).toBeFocused();
 // Moving forward from the last result on page 1 restores page 2 and its new item.
 await tab.locator('#product-nav-product-26').getByRole('link').filter({hasText:'QA traditional drink 26'}).click();
 await tab.getByRole('navigation',{name:'Navigate search results',exact:true}).getByRole('link',{name:/Next product.*QA traditional drink 27/}).click();
 await expect(tab.getByRole('heading',{level:1})).toHaveText('QA traditional drink 27');
 const nextBack=tab.getByRole('link',{name:/Back to results/});
 const nextUrl=new URL((await nextBack.getAttribute('href'))!,tab.url());
 for(const [key,value]of original)expect(nextUrl.searchParams.get(key)).toBe(value);
 expect(nextUrl.hash).toBe('#product-nav-product-27');
 await nextBack.click();await expect(tab.locator('article')).toHaveCount(4);
 await expect(tab.locator('#product-nav-product-27')).toBeVisible();await expect(tab.locator('#product-nav-product-27')).toBeFocused();
 await tab.goBack();await expect(tab.getByRole('heading',{level:1})).toHaveText('QA traditional drink 27');
 await tab.goForward();await expect(tab.locator('article')).toHaveCount(4);
 await expect.poll(()=>new URL(tab.url()).hash).toBe('#product-nav-product-27');
 await expect(tab.locator('#product-nav-product-27')).toBeVisible();await expect(tab.locator('#product-nav-product-27')).toBeFocused();
 expect(tabErrors).toEqual([]);await tab.close();
});

test('result previous and next stop at boundaries and direct unsafe return falls back to translated category',async({page})=>{
 await page.goto('/shop?q=bibigo+mandu&sort=sku&mode=export&lang=en');
 await page.locator('#product-nav-product-01').getByRole('link').filter({hasText:'Bibigo mandu 1'}).click();
 const movement=page.getByRole('navigation',{name:'Navigate search results',exact:true});
 await expect(movement.locator('[aria-disabled=true]')).toContainText('No previous product');
 await expect(movement.getByRole('link',{name:/Next product.*Bibigo mandu 2/})).toBeVisible();
 await expect(page.getByRole('link',{name:'Browse all Dumplings & Gyoza',exact:true})).toBeVisible();
 await expect(page.locator('main')).toContainText('Traditional dumpling 5');await expect(page.locator('main')).not.toContainText('전통 교자');
 await movement.getByRole('link',{name:/Next product.*Bibigo mandu 2/}).click();
 await page.getByRole('navigation',{name:'Navigate search results'}).getByRole('link',{name:/Next product.*Bibigo mandu 3/}).click();
 await page.getByRole('navigation',{name:'Navigate search results'}).getByRole('link',{name:/Next product.*Bibigo mandu 4/}).click();
 await expect(page.getByRole('navigation',{name:'Navigate search results'}).locator('[aria-disabled=true]')).toContainText('No next product');
 await page.goto('/products/nav-product-01?mode=export&lang=en&returnTo='+encodeURIComponent('https://outside.example/steal'));
 const fallback=page.getByRole('link',{name:/Browse this category/});const destination=new URL((await fallback.getAttribute('href'))!,page.url());
 expect(destination.hostname).toBe('127.0.0.1');expect(destination.pathname).toBe('/shop');expect(destination.searchParams.get('collection')).toBe('K-만두/냉동식품');expect(destination.searchParams.get('mode')).toBe('export');
 await expect(page.getByRole('navigation',{name:'Navigate search results'})).toContainText('Products in this category');
});

test('header and home expose categories and search and mark only the matching buying channel current',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/shop?mode=export&lang=en&q=mandu');
 const mainNav=page.getByRole('navigation',{name:'Main navigation',exact:true});
 await expect(mainNav.getByRole('link',{name:'Export catalogue',exact:true})).toHaveAttribute('aria-current','page');
 await expect(mainNav.getByRole('link',{name:'Domestic',exact:true})).not.toHaveAttribute('aria-current');
 const open=page.locator('header').getByRole('button',{name:'Categories',exact:false});await open.click();
 const categories=page.locator('header').getByRole('navigation',{name:'Product categories',exact:true});
 const kimchiCollection=categories.getByRole('link',{name:'Kimchi & Fermented Foods',exact:true}).and(categories.locator('a:not([href*="category="])'));await expect(kimchiCollection).toHaveCount(1);await kimchiCollection.focus();await page.keyboard.press('Escape');await expect(open).toBeFocused();await expect(open).toHaveAttribute('aria-expanded','false');
 await page.goto('/?mode=export&lang=en');const search=page.locator('main').getByRole('search',{name:'Product search',exact:true});
 await search.getByRole('searchbox').fill('bibigo mandu');await search.getByRole('button',{name:'Search',exact:true}).click();await expect(page.locator('article')).toHaveCount(4);expect(new URL(page.url()).searchParams.get('mode')).toBe('export');
});

for(const lang of ['ko','en'] as const)for(const mode of ['domestic','export']as const){
 test('responsive catalogue category keyboard and mobile image '+lang+' '+mode,async({page},info)=>{
  test.setTimeout(90000);
  await page.goto('/shop?lang='+lang+(mode==='export'?'&mode=export':''));
  for(const width of [360,390,768,1024,1440]){
   await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0));
   await expect(page.locator('article')).toHaveCount(12);await noOverflow(page);await accessible(page);
   await expect(page.locator('article').first().getByRole('img')).toBeVisible();
   if(width===390){
    const position=await page.locator('article').first().boundingBox();expect(position!.y).toBeLessThanOrEqual(560);await page.screenshot({path:info.outputPath('catalogue-'+lang+'-'+mode+'-390.png'),fullPage:true});
    const originalFontSize=await page.evaluate(()=>document.documentElement.style.fontSize);
    try{
     await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});await noOverflow(page);
     const card=page.locator('article').first();await expect(card.getByRole('img')).toBeVisible();
     const layout=await card.evaluate(element=>{const image=element.querySelector('img')!.getBoundingClientRect(),info=element.children[1].getBoundingClientRect();return {imageWidth:image.width,imageRight:image.right,infoLeft:info.left};});
     expect(layout.imageWidth).toBeLessThanOrEqual(65);expect(layout.imageRight).toBeLessThanOrEqual(layout.infoLeft+1);
    }finally{await page.evaluate(value=>{document.documentElement.style.fontSize=value;},originalFontSize);}
   }
   if(width<1024){const button=page.locator('main').getByRole('button',{name:lang==='en'?'All categories':'카테고리 전체',exact:false});await button.click();await expect(button).toHaveAttribute('aria-expanded','true');await page.locator('main').getByRole('navigation',{name:lang==='en'?'Product categories':'상품 카테고리',exact:true}).getByRole('link').first().focus();await page.keyboard.press('Escape');await expect(button).toBeFocused();await expect(button).toHaveAttribute('aria-expanded','false');}
  }
 });
}

test('administrator category menu preview is canonical bilingual and keyboard dismissible at mobile width',async({page,context})=>{
 let releaseMenus!:()=>void,held=false;
 const menusGate=new Promise<void>(resolve=>{releaseMenus=resolve;});
 const menusMatch=(url:URL)=>url.pathname==='/api/menus'&&url.searchParams.get('mode')==='admin';
 const menusRoute=async(route:Route)=>{
  if(route.request().method()!=='GET')return route.continue();
  held=true;await menusGate;await route.continue();
 };
 await page.route(menusMatch,menusRoute);
 try{
  await signIn(context);await page.setViewportSize({width:390,height:844});await page.goto('/admin/navigation');
  await expect.poll(()=>held).toBe(true);
  const loading=page.getByRole('status').filter({hasText:'Loading Navigation Engine Data...'});await expect(loading).toBeVisible();
  const opener=page.getByRole('button',{name:'ADD DEPTH 1 MENU',exact:true});await opener.click();const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Title / Label').fill('QA category preview');
  await dialog.getByLabel('상품 대분류').selectOption('K-만두/냉동식품');await dialog.getByLabel('제품종류').selectOption('만두 & 교자');await dialog.getByLabel('구매 유형').selectOption('export');
  const english=dialog.getByRole('link',{name:'English results preview (new tab)',exact:true});const url=new URL((await english.getAttribute('href'))!,page.url());
  expect(url.pathname).toBe('/shop');expect(url.searchParams.get('collection')).toBe('K-만두/냉동식품');expect(url.searchParams.get('category')).toBe('만두 & 교자');expect(url.searchParams.get('mode')).toBe('export');expect(url.searchParams.get('lang')).toBe('en');expect(url.searchParams.has('cat')).toBe(false);
  await expect(loading).toBeVisible();await noOverflow(page);await accessible(page);
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
  await expect(loading).toBeVisible();await accessible(page);
 }finally{
  releaseMenus();await page.unroute(menusMatch,menusRoute);
 }
 await expect(page.getByRole('status').filter({hasText:'Loading Navigation Engine Data...'})).toHaveCount(0);
});
