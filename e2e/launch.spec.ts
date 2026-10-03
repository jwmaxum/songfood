import {test,expect,type Page,type BrowserContext} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function isolated(page:Page){
 await page.route('**/*',route=>{
  const host=new URL(route.request().url()).hostname;
  return ['127.0.0.1','localhost'].includes(host)?route.continue():route.abort();
 });
}
async function signIn(context:BrowserContext,role:'customer'|'admin'|'product_staff'){
 await context.addCookies([{name:role==='customer'?'sf_customer_access':'sf_admin_access',value:(role==='customer'?'c':role==='admin'?'a':'b').repeat(64),url:'http://127.0.0.1:3100',httpOnly:true,sameSite:'Strict'}]);
}
async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);}
async function accessible(page:Page){
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
 expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
}
const browserErrors=new WeakMap<Page,string[]>();
test.afterEach(async({page,request})=>{expect(browserErrors.get(page)||[]).toEqual([]);const state=await(await request.get('http://127.0.0.1:4011/__state')).json();expect(state.unknown).toEqual([]);});
test.beforeEach(async({page,request})=>{browserErrors.set(page,[]);page.on('pageerror',error=>browserErrors.get(page)!.push(error.message));await request.post('http://127.0.0.1:4011/__reset');await isolated(page);});
for(const width of [360,390,768,1440])for(const lang of ['ko','en'] as const){
 test('catalogue and account '+lang+' '+width,async({page},info)=>{
  await page.setViewportSize({width,height:900});await page.goto('/shop?mode=export&lang='+lang);
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  await expect(page.getByRole('heading',{level:1})).toContainText('Export catalogue');
  await expect(page.locator('article')).toHaveCount(12);await noOverflow(page);await accessible(page);
  const metrics=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;const r=performance.getEntriesByType('resource') as PerformanceResourceTiming[];return {url:location.pathname+location.search,ttfbMs:Math.round(n.responseStart-n.requestStart),domReadyMs:Math.round(n.domContentLoadedEventEnd),loadMs:Math.round(n.loadEventEnd),documentBytes:n.decodedBodySize,scriptBytes:r.filter(x=>x.initiatorType==='script').reduce((s,x)=>s+x.decodedBodySize,0),resourceBytes:r.reduce((s,x)=>s+x.decodedBodySize,0),requests:r.length};});await writeFile(info.outputPath('catalogue-metrics.json'),JSON.stringify(metrics,null,2));
  await page.screenshot({path:info.outputPath('catalogue-'+width+'-'+lang+'.png'),fullPage:true});
  await page.getByRole('button',{name:lang==='en'?'Next':'다음',exact:true}).click();await expect(page.locator('article')).toHaveCount(4);await page.goBack();await expect(page.locator('article')).toHaveCount(12);
  await page.goto('/account/login?lang='+lang);await expect(page.getByLabel(lang==='en'?'Email':'이메일',{exact:true})).toBeVisible();await noOverflow(page);await accessible(page);
  if(width<1024){const menu=page.locator('button[aria-controls="mobile-menu"]');await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await page.locator('#mobile-menu a').first().focus();await page.keyboard.press('Escape');await expect(menu).toBeFocused();}
 });
}
test('SSR language, metadata and supported language switch are stable',async({page,request})=>{
 const response=await request.get('/shop?lang=en'),html=await response.text();expect(html).toContain('<html lang="en"');expect(html).toContain('lang=en');expect(response.headers()['content-language']).toBe('en');
 await page.goto('/shop?mode=export&lang=ko');await page.getByLabel('Language / 언어').selectOption('en');await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page).toHaveURL(/lang=en/);expect(await page.getByLabel('Language / 언어').locator('option').allTextContents()).toEqual(['한국어','English']);
 await page.keyboard.press('Tab'); // focus order is independently checked below
 await page.goto('/?lang=en');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#main-content')).toBeFocused();
});
test('email request keeps English callback and shows a focused actionable failure',async({page,request})=>{
 await page.goto('/account/login?lang=en');await page.getByLabel('Email',{exact:true}).fill('qa@example.invalid');await page.getByRole('button',{name:'Send email verification link',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'verification link'})).toBeVisible();
 const state=await(await request.get('http://127.0.0.1:4011/__state')).json();expect(state.emails).toHaveLength(1);expect(state.emails[0].redirect).toContain('/account/confirmed?lang=en');
 await page.route('**/api/auth/email',r=>r.fulfill({status:429,json:{success:false,error:'요청이 많습니다. 잠시 후 다시 시도해 주세요.'}}));await page.getByRole('button',{name:'Resend verification link'}).click();
 await expect(page.locator('main [role="alert"][tabindex="-1"]')).toContainText('Too many requests');await expect(page.locator('main [role="alert"][tabindex="-1"]')).toBeFocused();await expect(page.getByLabel('Email',{exact:true})).toHaveValue('qa@example.invalid');
});
test('RFQ quantity, VAT-excluded FOB preview, retry and real application submission',async({page,context,request})=>{
 await signIn(context,'customer');await page.setViewportSize({width:390,height:900});await page.goto('/shop?mode=export&lang=en');
 const first=page.locator('article').first();await expect(first.getByRole('spinbutton')).toHaveValue('3');await first.getByRole('button',{name:'Add to RFQ'}).click();
 await page.goto('/rfq?lang=en');await expect(page.getByRole('spinbutton')).toHaveValue('3');
 await page.getByRole('button',{name:'Check FOB price'}).click();await expect(page.getByText('$24.00',{exact:false})).toBeVisible();
 await page.getByLabel('Contact name *',{exact:true}).fill('QA Buyer');await page.getByLabel('Email *',{exact:true}).fill('qa@example.invalid');await page.getByLabel('Destination country *',{exact:true}).fill('Japan');
 let key='';await page.route('**/api/commercial-inquiries',async route=>{if(route.request().method()!=='POST')return route.continue();key=route.request().headers()['idempotency-key'];await route.fulfill({status:503,json:{success:false,error:'서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'}});});
 await page.getByRole('button',{name:'Submit RFQ',exact:true}).click();await expect(page.locator('main [role="alert"][tabindex="-1"]')).toBeFocused();await expect(page.getByLabel('Contact name *',{exact:true})).toHaveValue('QA Buyer');
 await page.unroute('**/api/commercial-inquiries');const sent=page.waitForRequest(r=>r.url().endsWith('/api/commercial-inquiries')&&r.method()==='POST');await page.getByRole('button',{name:'Submit RFQ',exact:true}).click();expect((await sent).headers()['idempotency-key']).toBe(key);await expect(page.getByText('RFQ received',{exact:true})).toBeVisible();
 const state=await(await request.get('http://127.0.0.1:4011/__state')).json();expect(state.records).toHaveLength(1);expect(state.records[0].items[0].quantity_cartons).toBe(3);await noOverflow(page);await accessible(page);
});
test('admin public company settings save, stale edit and role / CSRF boundaries',async({page,context,request},info)=>{
 await signIn(context,'admin');await page.setViewportSize({width:360,height:900});await page.goto('/admin/settings');await expect(page.getByLabel('대표자',{exact:true})).toBeVisible();await noOverflow(page);await accessible(page);
 await page.getByLabel('대표자',{exact:true}).fill('QA 운영자');await page.getByLabel('사업장 주소',{exact:true}).fill('QA ONLY 검증용 주소');await page.getByLabel('변경 사유 *').fill('QA 공개 정보 저장 검증');await page.getByRole('button',{name:'공개 정보 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'저장했습니다'})).toBeVisible();
 await page.screenshot({path:info.outputPath('admin-settings-360.png'),fullPage:true});await page.goto('/about?lang=ko');await expect(page.locator('main').getByText('QA ONLY 검증용 주소',{exact:true})).toBeVisible();
 const state=await(await request.get('http://127.0.0.1:4011/__state')).json();
 const endpoint='/api/admin/business-settings',headers={Origin:'http://127.0.0.1:3100','Content-Type':'application/json'};
 const stale=await context.request.put(endpoint,{headers,data:{profile:state.settings.profile,revision:1,reason:'QA stale revision'}});expect(stale.status()).toBe(409);
 const foreign=await context.request.put(endpoint,{headers:{...headers,Origin:'https://evil.example'},data:{profile:state.settings.profile,revision:2,reason:'QA rejected origin'}});expect(foreign.status()).toBe(403);
 await context.clearCookies();await signIn(context,'product_staff');const denied=await context.request.get(endpoint);expect(denied.status()).toBe(403);
});
test('staff operations is usable at four widths and shows actual fixture work',async({page,context},info)=>{
 await signIn(context,'admin');await page.goto('/admin');await expect(page.getByText('QA fixture RFQ',{exact:true})).toBeVisible();
 for(const width of [360,390,768,1440]){await page.setViewportSize({width,height:900});await noOverflow(page);await accessible(page);await page.screenshot({path:info.outputPath('operations-'+width+'.png'),fullPage:true});}
});
test('policy pages expose confirmed contacts without fictional delivery or PDF offers',async({page})=>{
 for(const path of ['/about','/terms','/privacy','/catalogues','/contact']){
  await page.goto(path+'?lang=en');await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('footer')).toContainText('3song876@daum.net');await noOverflow(page);await accessible(page);
  expect(await page.locator('main a[href="#"]').count()).toBe(0);
 }
});

test('domestic checkout preserves cart and delivery input after a failed request',async({page,context})=>{
 await signIn(context,'customer');await page.setViewportSize({width:360,height:900});await page.goto('/shop?lang=ko');
 const first=page.locator('article').first();await expect(first.getByRole('spinbutton')).toHaveValue('2');await first.getByRole('button',{name:'구매함 담기'}).click();
 await page.goto('/checkout?lang=en');await expect(page).toHaveURL(/lang=ko/);await expect(page.locator('html')).toHaveAttribute('lang','ko');
 await expect(page.getByText('상품 합계 ₩22,000',{exact:true})).toBeVisible();
 await page.getByLabel('수령인',{exact:true}).fill('QA Buyer');await page.getByLabel('연락처',{exact:true}).fill('010-0000-0000');await page.getByLabel('우편번호',{exact:true}).fill('00000');await page.getByLabel('주소',{exact:true}).fill('QA ONLY 주소');
 await page.getByRole('checkbox').check();await page.route('**/api/orders',r=>r.fulfill({status:503,json:{success:false,error:'주문 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.'}}));
 await page.getByRole('button',{name:'주문 접수하기',exact:true}).click();await expect(page.locator('main [role="alert"][tabindex="-1"]')).toBeFocused();await expect(page.getByLabel('주소',{exact:true})).toHaveValue('QA ONLY 주소');await noOverflow(page);await accessible(page);
});
test('English PI terms, keyboard scroll, retry, acceptance and expiry at mobile width',async({page,context})=>{
 await signIn(context,'customer');await page.setViewportSize({width:360,height:900});
 const snapshot={kind:'proforma_invoice',currency:'USD',incoterms:'FOB',valid_until:new Date(Date.now()+86400000).toISOString(),source_valid_until:new Date(Date.now()+86400000).toISOString(),seller:{name:'QA ONLY seller',address:'QA fixture address',email:'qa@example.invalid',phone:'QA phone',payment_terms:'QA only, do not pay',bank_details:'QA no bank'},buyer:{name:'QA buyer',contact:'QA',address:'QA address',country:'Japan',destination:'Tokyo'},lead_time:'QA terms',documents:[],change_reason:'QA only',notice:'PROFORMA INVOICE - Not a final Commercial Invoice.',lines:[{product_id:'qa-product-1',sku:'QA-001',name:'QA food',quantity:3,ea_per_ctn:10,loading_port:'Busan',unit_minor:800,total_minor:2400}],total_minor:2400};
 let doc={id:'qa-pi',inquiry_id:'qa-inquiry',number:'QA-PI-ONLY',version:1,status:'issued',snapshot,issued_at:new Date().toISOString(),accepted_at:null as string|null,change_requested_at:null,pdf_sha256:'f'.repeat(64),supersedes_id:null};
 await page.route('**/api/account/pi',r=>r.fulfill({json:{documents:[doc]}}));
 let calls=0,key='';await page.route('**/api/account/pi/qa-pi',async r=>{
  if(r.request().method()==='POST'){const body=r.request().postDataJSON();calls++;if(calls===1){key=body.request_key;return r.fulfill({status:503,json:{error:'서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'}});}expect(body.request_key).toBe(key);expect(body.confirmed).toBe(true);doc={...doc,accepted_at:new Date().toISOString()};}
  return r.fulfill({json:{document:doc}});
 });
 await page.goto('/account?lang=en');await page.getByRole('button',{name:/QA-PI-ONLY/}).click();await expect(page.locator('#proforma p').filter({has:page.locator('strong')}).first()).toContainText('Not a final Commercial Invoice.');
 await page.getByRole('region',{name:'PI line items · scroll horizontally'}).focus();await expect(page.getByRole('region',{name:'PI line items · scroll horizontally'})).toBeFocused();await expect(page.getByRole('link',{name:'Download PDF'})).toHaveAttribute('href','/api/account/pi/qa-pi/pdf');
 const accept=page.getByRole('button',{name:'Accept terms',exact:true});await expect(accept).toBeDisabled();await page.getByRole('checkbox',{name:'I have reviewed and accept this PI’s amounts, FOB, lead time and payment terms.'}).check();await accept.click();await expect(page.locator('#proforma [role="alert"]')).toBeFocused();await accept.click();await expect(page.getByRole('status').filter({hasText:'PI acceptance recorded.'})).toBeVisible();await noOverflow(page);await accessible(page);
 doc={...doc,accepted_at:null,snapshot:{...snapshot,valid_until:'2020-01-01T00:00:00Z'}};await page.reload();await page.getByRole('button',{name:/QA-PI-ONLY/}).click();await expect(page.getByRole('button',{name:'Accept terms',exact:true})).toHaveCount(0);await expect(page.getByText('This document cannot be accepted. Review the latest valid PI revision.',{exact:true})).toBeVisible();
});

test('client navigation into domestic orders refreshes the root language',async({page,context})=>{
 await signIn(context,'customer');await page.goto('/account?lang=en');await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.getByRole('link',{name:'My orders, payments and deliveries',exact:true}).first().click();
 await expect(page).toHaveURL(/account\/orders\?lang=ko/);await expect(page.locator('html')).toHaveAttribute('lang','ko');await expect(page.getByRole('heading',{name:'내 주문',exact:true})).toBeVisible();await expect(page.getByText('표시할 주문이 없습니다.',{exact:false})).toBeVisible();
});
