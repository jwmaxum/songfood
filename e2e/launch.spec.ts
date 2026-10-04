import {test,expect,type Page,type BrowserContext} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function isolated(page:Page){
 await page.route('**/*',route=>{
  const host=new URL(route.request().url()).hostname;
  return ['127.0.0.1','localhost'].includes(host)?route.continue():route.abort();
 });
}
async function signIn(context:BrowserContext,role:'customer'|'admin'|'product_staff'|'sub_admin'){
 await context.addCookies([{name:role==='customer'?'sf_customer_access':'sf_admin_access',value:(role==='customer'?'c':role==='admin'?'a':role==='sub_admin'?'d':'b').repeat(64),url:'http://127.0.0.1:3100',httpOnly:true,sameSite:'Strict'}]);
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

test('launch controls pause new RFQ, preserve replay, reject stale and unauthorized changes',async({page,context,request},info)=>{
 await signIn(context,'admin');await page.setViewportSize({width:360,height:900});await page.goto('/admin/launch');
 await expect(page.getByRole('heading',{name:'오픈 전 확인 항목',exact:true})).toBeVisible();
 await expect(page.getByText('고객 이메일 SMTP 연결 점검 필요',{exact:false})).toBeVisible();
 await noOverflow(page);await accessible(page);
 const body={kind:'export_rfq',contact_name:'QA Buyer',email:'qa@example.invalid',country:'Japan',incoterms:'FOB',items:[{product_id:'qa-product-1',product_name:'untrusted',quantity_cartons:3}]};
 const headers={Origin:'http://127.0.0.1:3100','Content-Type':'application/json','Idempotency-Key':'00000000-0000-4000-8000-000000000911'};
 const first=await context.request.post('/api/commercial-inquiries',{headers,data:body});expect(first.status()).toBe(201);
 await page.getByLabel('신규 RFQ·국내 구매 문의 중지',{exact:true}).check();
 await page.getByLabel('운영 책임자·대응 담당자',{exact:true}).selectOption('00000000-0000-4000-8000-000000000801');await page.getByLabel('장애 확인 후 대응 목표').fill('30');
 await page.getByLabel('중지·재개 또는 담당자 변경 사유 *').fill('QA 장애 중지 검증');
 await page.getByRole('button',{name:'운영 상태 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'운영 상태를 저장했습니다'})).toBeVisible();
 await expect(page.getByLabel('신규 RFQ·국내 구매 문의 중지',{exact:true})).toBeChecked();
 const blocked=await context.request.post('/api/commercial-inquiries',{headers:{...headers,'Idempotency-Key':'00000000-0000-4000-8000-000000000912'},data:body});expect(blocked.status()).toBe(503);expect((await blocked.json()).success).toBe(false);
 const replay=await context.request.post('/api/commercial-inquiries',{headers,data:body});expect(replay.status()).toBe(200);expect((await replay.json()).replayed).toBe(true);
 const state={inquiries_paused:false,orders_paused:false,pi_paused:false,owner_id:'00000000-0000-4000-8000-000000000801',response_minutes:30};
 const stale=await context.request.put('/api/admin/launch',{headers:{Origin:headers.Origin},data:{revision:1,state,reason:'QA stale'}});expect(stale.status()).toBe(409);
 const foreign=await context.request.put('/api/admin/launch',{headers:{Origin:'https://evil.example'},data:{revision:2,state,reason:'QA denied origin'}});expect(foreign.status()).toBe(403);
 await page.screenshot({path:info.outputPath('launch-controls-360.png'),fullPage:true});
 await page.getByLabel('신규 RFQ·국내 구매 문의 중지',{exact:true}).uncheck();await page.getByLabel('중지·재개 또는 담당자 변경 사유 *').fill('QA 복구 후 재개');const resume=page.waitForResponse(r=>r.url().endsWith('/api/admin/launch')&&r.request().method()==='PUT');await page.getByRole('button',{name:'운영 상태 저장',exact:true}).click();expect((await resume).status()).toBe(200);await expect(page.getByLabel('신규 RFQ·국내 구매 문의 중지',{exact:true})).not.toBeChecked();
 const accepted=await context.request.post('/api/commercial-inquiries',{headers:{...headers,'Idempotency-Key':'00000000-0000-4000-8000-000000000912'},data:body});expect(accepted.status()).toBe(201);
 expect((await(await request.get('http://127.0.0.1:4011/__state')).json()).records).toHaveLength(2);
 expect((await request.get('/api/health')).status()).toBe(200);
 await context.clearCookies();await signIn(context,'product_staff');expect((await context.request.get('/api/admin/launch')).status()).toBe(403);
});

test('release review, stale approval and limited catalogue at mobile widths',async({page,context},info)=>{
 await signIn(context,'admin');await page.goto('/admin/releases');await expect(page.getByText('검증용 냉동 식품 1 · QA-001',{exact:true})).toBeVisible();
 for(const width of [360,390,768,1440]){await page.setViewportSize({width,height:900});await noOverflow(page);await accessible(page);}
 const first=page.getByRole('listitem').filter({hasText:'검증용 냉동 식품 1 · QA-001'}).first();await first.getByRole('button',{name:'출시 검수·철회'}).click();
 await page.getByLabel('국내 출시 승인',{exact:false}).check();await page.getByLabel('실제 검수 근거 또는 철회 사유').fill('QA 공급사 표시사항 포장 MOQ 및 가격 검수');await page.getByRole('button',{name:'검수 기록 저장',exact:true}).click();
 await expect(first.getByText('국내 출시 검수 완료',{exact:false})).toBeVisible();await page.getByLabel('출시 제한 변경 사유').fill('QA 제한 출시 대상 1개 승인 후 활성화');await page.getByRole('button',{name:'승인 상품 거래 제한 활성화',exact:true}).click();await expect(page.getByRole('status')).toContainText('활성');
 const headers={Origin:'http://127.0.0.1:3100'};expect((await context.request.put('/api/admin/releases',{headers,data:{product_id:'qa-product-1',revision:0,hash:'a'.repeat(64),domestic:true,export:false,reason:'QA stale review denied'}})).status()).toBe(409);
 expect((await context.request.put('/api/admin/releases',{headers:{Origin:'https://evil.example'},data:{action:'policy',revision:2,enabled:false,reason:'QA bad origin denied'}})).status()).toBe(403);
 await page.screenshot({path:info.outputPath('release-review.png'),fullPage:true});
 await context.clearCookies();await signIn(context,'customer');const catalogue=await context.request.get('/api/pricing/catalogue');expect(catalogue.status()).toBe(200);const prices=(await catalogue.json()).products;expect(Object.keys(prices[0].units).length).toBeGreaterThan(0);expect(prices[1].units).toEqual({});expect(prices[1].message).toContain('출시 검수');
 await context.clearCookies();await signIn(context,'product_staff');expect((await context.request.get('/api/admin/releases')).status()).toBe(200);expect((await context.request.put('/api/admin/releases',{headers,data:{action:'policy',revision:2,enabled:false,reason:'QA unauthorized action'}})).status()).toBe(403);
});

test('Gmail verification sends nothing, CRM preview confirmation and duplicate-safe document mail',async({page,context,request},info)=>{
 await signIn(context,'admin');await page.goto('/admin/mail');await expect(page.getByText('SMTP_VERIFY_FAILED',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'SMTP 연결·인증 점검 · 메일 발송 없음',exact:true}).click();await expect(page.getByRole('status')).toContainText('SMTP_VERIFIED');
 for(const width of [360,390,768,1440]){await page.setViewportSize({width,height:900});await noOverflow(page);await accessible(page);}
 expect((await(await request.get('http://127.0.0.1:4011/__state')).json()).documentEmails).toHaveLength(0);
 const headers={Origin:'http://127.0.0.1:3100','Idempotency-Key':'00000000-0000-4000-8000-000000000935'};
 const created=await context.request.post('/api/commercial-inquiries',{headers,data:{kind:'domestic_wholesale',contact_name:'QA customer',email:'buyer@example.invalid',phone:'01000000000'}});expect(created.status()).toBe(201);const inquiry=(await created.json()).id;
 await page.goto('/admin/crm?inquiry='+inquiry);await page.getByText('고객 이메일·내부 테스트 알림',{exact:false}).click();await page.getByRole('button',{name:'수신자·메일 미리보기 / 결과 조회',exact:true}).click();
 await expect(page.getByText('수신자: buyer@example.invalid',{exact:true})).toBeVisible();const send=page.getByRole('button',{name:'실제 이메일 발송',exact:true});await expect(send).toBeDisabled();
 await page.getByLabel('발송 또는 결과 확인 사유').fill('QA 고객 문서 업데이트 내용 확인');await page.getByLabel('수신자·내용을 확인했습니다.',{exact:false}).check();await send.click();await expect(page.getByText('SMTP 서버 접수 · 수신 확인 아님',{exact:false})).toBeVisible();
 await noOverflow(page);await accessible(page);await page.screenshot({path:info.outputPath('crm-email-confirmation.png'),fullPage:true});
 const state=await(await request.get('http://127.0.0.1:4011/__state')).json();expect(state.documentEmails).toHaveLength(1);
 const email=state.documentEmails[0],id='00000000-0000-4000-8000-000000000930',endpoint='/api/admin/crm/notifications/'+id+'/email';
 expect((await context.request.post(endpoint,{headers,data:{confirmed:true,request_key:email.key,hash:'a'.repeat(64),reason:'QA same key replay'}})).status()).toBe(200);
 expect((await(await request.get('http://127.0.0.1:4011/__state')).json()).documentEmails).toHaveLength(1);
 await context.clearCookies();await signIn(context,'product_staff');expect((await context.request.get('/api/admin/mail')).status()).toBe(403);expect((await context.request.get(endpoint)).status()).toBe(403);
});

test('chief manages verified staff, role revisions and directory-linked operating owner',async({page,context,request},info)=>{
 await signIn(context,'admin');await page.goto('/admin/users');await expect(page.getByRole('heading',{name:'하위관리자·권한',exact:true})).toBeVisible();
 const chief=page.locator('article').filter({hasText:'최고관리자'});await expect(chief.getByText('보호된 계정입니다.',{exact:false})).toBeVisible();expect(await chief.locator('button').count()).toBe(0);
 for(const width of [360,390,768,1440]){await page.setViewportSize({width,height:900});await noOverflow(page);await accessible(page);}
 await page.getByLabel('등록 이메일 *',{exact:true}).fill('buyer@example.invalid');await page.getByLabel('등록 이름 *',{exact:true}).fill('QA new operator');await page.getByLabel('등록 업무 권한',{exact:true}).selectOption('order_staff');await page.getByLabel('등록 사유 *',{exact:true}).fill('QA verified operator registration');
 await page.getByRole('button',{name:'직원 등록',exact:true}).click();await expect(page.getByRole('status')).toContainText('저장했습니다');
 const row=page.locator('article').filter({hasText:'buyer@example.invalid'});await expect(row.getByLabel('업무 권한',{exact:true})).toHaveValue('order_staff');
 await page.goto('/admin/launch');await page.getByLabel('운영 책임자·대응 담당자',{exact:true}).selectOption('00000000-0000-4000-8000-000000000802');await page.getByLabel('장애 확인 후 대응 목표',{exact:false}).fill('30');await page.getByLabel('중지·재개 또는 담당자 변경 사유 *').fill('QA registered operator assignment');await page.getByRole('button',{name:'운영 상태 저장',exact:true}).click();await expect(page.getByRole('status')).toContainText('저장했습니다');await expect(page.getByText('QA new operator · 30분 내 대응 목표',{exact:true})).toBeVisible();await noOverflow(page);await accessible(page);
 await page.goto('/admin/users');const operator=page.locator('article').filter({hasText:'buyer@example.invalid'});
 await operator.getByLabel('직원 이름',{exact:true}).fill('QA renamed operator');await operator.getByLabel('업무 권한',{exact:true}).selectOption('inquiry_staff');await operator.getByLabel('수정·삭제 사유 *').fill('QA role and operator name revision');await operator.getByRole('button',{name:'직원 정보 저장',exact:true}).click();await expect(page.getByRole('status')).toContainText('저장했습니다');
 const headers={Origin:'http://127.0.0.1:3100'};expect((await context.request.patch('/api/admin/users',{headers,data:{id:'00000000-0000-4000-8000-000000000802',revision:1,name:'stale',role:'admin',status:'active',reason:'QA stale update denied'}})).status()).toBe(409);
 expect((await context.request.delete('/api/admin/users',{headers,data:{id:'00000000-0000-4000-8000-000000000801',revision:1,confirmed:true,reason:'QA protected chief denied'}})).status()).toBe(403);
 expect((await context.request.post('/api/admin/users',{headers:{Origin:'https://evil.example'},data:{email:'buyer@example.invalid',name:'QA',role:'admin',reason:'QA foreign origin denied'}})).status()).toBe(403);
 const changed=await(await context.request.get('/api/admin/launch')).json();expect(changed.controls.owner).toBe('QA renamed operator');
 const edited=page.locator('article').filter({hasText:'buyer@example.invalid'});await edited.getByLabel('수정·삭제 사유 *').fill('QA staff membership removal');await edited.getByLabel('이 직원의 관리자 권한을 삭제합니다.',{exact:true}).check();await edited.getByRole('button',{name:'하위관리자 삭제',exact:true}).click();await expect(page.getByRole('status')).toContainText('삭제했습니다');await expect(page.locator('article').filter({hasText:'buyer@example.invalid'})).toHaveCount(0);
 const final=await(await context.request.get('/api/admin/launch')).json();expect(final.controls.owner_id).toBeNull();expect(final.controls.owner).toBe('');
 await page.screenshot({path:info.outputPath('staff-management.png'),fullPage:true});
 const state=await(await request.get('http://127.0.0.1:4011/__state')).json();expect(state.emails).toHaveLength(0);expect(state.staffEvents).toHaveLength(3);
 await context.clearCookies();await signIn(context,'sub_admin');expect((await context.request.get('/api/admin/session')).status()).toBe(200);expect((await context.request.get('/api/admin/users')).status()).toBe(403);expect((await context.request.post('/api/admin/users',{headers,data:{email:'buyer@example.invalid',name:'QA denied',role:'admin',reason:'QA subadmin denied'}})).status()).toBe(403);await page.goto('/admin/users');await expect(page.getByText('최고관리자 jwmaxum@gmail.com만',{exact:false})).toBeVisible();
});

test('suspended staff loses existing session and operating assignment',async({context,page})=>{
 await signIn(context,'admin');const headers={Origin:'http://127.0.0.1:3100'};
 const before=await(await context.request.get('/api/admin/launch')).json();
 expect((await context.request.put('/api/admin/launch',{headers,data:{revision:before.controls.revision,state:{inquiries_paused:false,orders_paused:false,pi_paused:false,owner_id:'00000000-0000-4000-8000-000000000803',response_minutes:15},reason:'QA active product staff owner'}})).status()).toBe(200);
 expect((await context.request.patch('/api/admin/users',{headers,data:{id:'00000000-0000-4000-8000-000000000803',revision:1,name:'QA product_staff',role:'product_staff',status:'suspended',reason:'QA suspend active owner'}})).status()).toBe(200);
 const after=await(await context.request.get('/api/admin/launch')).json();expect(after.controls.owner_id).toBeNull();
 await context.clearCookies();await signIn(context,'product_staff');expect((await context.request.get('/api/admin/session')).status()).toBe(401);expect((await context.request.get('/api/admin/releases')).status()).toBe(403);
 await page.goto('/admin');await expect(page.getByRole('heading',{name:'관리자 로그인',exact:false})).toBeVisible();
});

test('staff email login reuses approved callback and clears token before administrator navigation',async({page,context,request},info)=>{
 await page.goto('/admin');await page.getByLabel('직원 인증 이메일',{exact:true}).fill('product_staff@example.invalid');await page.getByRole('button',{name:'직원 인증 링크 발송',exact:true}).click();await expect(page.getByRole('status')).toContainText('직원 인증 링크를 요청');
 const state=await(await request.get('http://127.0.0.1:4011/__state')).json();expect(state.emails).toHaveLength(1);expect(state.emails[0].redirect).toBe('http://127.0.0.1:3100/account/confirmed?lang=ko');expect(state.emails[0].createUser).toBe(false);
 await noOverflow(page);await accessible(page);await page.screenshot({path:info.outputPath('staff-email-login.png'),fullPage:true});
 await page.goto('/account/confirmed?lang=ko#access_token=qa_staff_verification_token_valid_not_real&token_type=bearer');await expect(page).toHaveURL(/\/admin$/);await expect(page.getByRole('heading',{name:'상품·가격 점검',exact:true})).toBeVisible();expect(page.url()).not.toContain('access_token');
 const cookies=await context.cookies();expect(cookies.find(c=>c.name==='sf_admin_access')?.httpOnly).toBe(true);expect((await context.request.get('/api/admin/users')).status()).toBe(403);
});

test('handover staff self review, current basis and limited release hold',async({page,context,request},info)=>{
 await signIn(context,'admin');await page.setViewportSize({width:360,height:900});await page.goto('/admin/handover');
 await expect(page.getByRole('heading',{name:'업무 인수·제한 출시 검수',exact:true})).toBeVisible();
 await expect(page.getByText('보류 · 아래 인수 조건 확인 필요')).toHaveCount(2);
 await page.getByRole('button',{name:'내 직원 로그인·업무 권한 결과 기록',exact:true}).click();await page.getByLabel('검수 결과',{exact:true}).selectOption('passed');await page.getByLabel('검수 근거·미완료 사유',{exact:true}).fill('QA 현재 직원 로그인과 업무 권한을 실제 확인');await page.getByRole('button',{name:'내 검수 기록 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'검수 기록을 저장'})).toBeVisible();
 await page.getByRole('button',{name:'출시 대상 상품·가격·MOQ 인수 결과 기록',exact:true}).click();await page.getByLabel('검수 근거·미완료 사유',{exact:true}).fill('QA 출시 자료 미완료로 보류 유지');await page.getByRole('button',{name:'내 검수 기록 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'검수 기록을 저장'})).toBeVisible();
 const endpoint='/api/admin/handover',headers={Origin:'http://127.0.0.1:3100'};const current=await(await context.request.get(endpoint)).json(),saved=current.reviews.find((r:{check_id:string})=>r.check_id==='catalogue');const payload={check_id:'catalogue',revision:saved.revision,basis:current.basis.catalogue,result:'blocked',notes:'QA current configuration checkpoint',reference_id:null,received:false};
 const state=await(await request.get('http://127.0.0.1:4011/__state')).json();expect((await context.request.put('/api/admin/business-settings',{headers,data:{revision:state.settings.revision,profile:state.settings.profile,reason:'QA configuration change'}})).status()).toBe(200);
 expect((await context.request.put(endpoint,{headers,data:payload})).status()).toBe(409);
 expect((await context.request.put(endpoint,{headers:{Origin:'https://evil.example'},data:payload})).status()).toBe(403);
 const latest=await(await context.request.get(endpoint)).json();expect((await context.request.put(endpoint,{headers,data:{...payload,check_id:'domestic',revision:0,basis:latest.basis.domestic,result:'passed',reference_id:'00000000-0000-4000-8000-000000000999'}})).status()).toBe(400);
 await page.getByRole('button',{name:'최신 인수 상태 불러오기',exact:true}).click();await expect(page.getByText('자료 변경·근거 상태 변경 · 재검수 필요',{exact:true})).toBeVisible();
 for(const width of [360,390,768,1440]){await page.setViewportSize({width,height:900});await noOverflow(page);await accessible(page);}
 await page.setViewportSize({width:360,height:900});await page.screenshot({path:info.outputPath('handover-admin-360.png'),fullPage:true});
 const staffPage=await context.newPage();await isolated(staffPage);const staffErrors:string[]=[];staffPage.on('pageerror',e=>staffErrors.push(e.message));await staffPage.context().clearCookies();await signIn(context,'product_staff');await staffPage.goto('/admin/handover');await expect(staffPage.getByRole('button',{name:'내 직원 로그인·업무 권한 결과 기록',exact:true})).toBeVisible();await expect(staffPage.getByRole('button',{name:'운영 담당자·중지·재개 인수 결과 기록',exact:true})).toHaveCount(0);
 const staff=await(await context.request.get(endpoint)).json();expect(staff.reviews).toEqual([]);expect(staff.assessment).toBeUndefined();
 expect((await context.request.put(endpoint,{headers,data:{...payload,check_id:'operations',revision:0,basis:staff.basis.access}})).status()).toBe(403);
 expect(staffErrors).toEqual([]);await staffPage.close();
});

test('initial operations exposes current priorities and keeps release holds, mobile and role scope',async({page,context,request},info)=>{
 await signIn(context,'admin');await page.goto('/admin/operations');await expect(page.getByRole('heading',{name:'초기 운영 점검',exact:true})).toBeVisible();await expect(page.getByText('보류 · 운영 자료·실제 인수 확인 필요',{exact:true})).toHaveCount(2,{timeout:30000}); const release=page.getByRole('region',{name:'제한 출시 인수 현황'}).locator('details').first();await expect(release.locator('ul')).not.toBeVisible();await release.locator('summary').focus();await page.keyboard.press('Enter');await expect(release.locator('ul')).toBeVisible();await page.keyboard.press('Enter');await expect(release.locator('ul')).not.toBeVisible();
 const unknown=page.getByRole('region',{name:'거래·문서 후속 조치'}).getByRole('link').filter({hasText:'고객 메일 결과 불명'});await expect(unknown).toContainText('2');await unknown.click();await expect(page).toHaveURL(/category=mail_unknown/);await expect(page.getByText('QA actual mail follow-up',{exact:true})).toBeVisible();
 await page.goto('/admin/operations');await page.getByRole('region',{name:'우선 처리 업무'}).getByRole('link').filter({hasText:'재배정 필요'}).click();await expect(page).toHaveURL(/assigned=reassign/);await expect(page.getByLabel('업무 담당 필터',{exact:true})).toHaveValue('reassign');
 await page.goto('/admin/operations');for(const width of [360,390,768,1440]){await page.setViewportSize({width,height:900});await noOverflow(page);await accessible(page);}await page.setViewportSize({width:360,height:900});await page.screenshot({path:info.outputPath('initial-operations-360.png'),fullPage:true});
 await context.clearCookies();await signIn(context,'product_staff');await page.goto('/admin/operations');await expect(page.getByRole('region',{name:'상품·가격 운영 점검'})).toBeVisible();await expect(page.getByRole('region',{name:'거래·문서 후속 조치'})).toHaveCount(0);await expect(page.getByRole('region',{name:'제한 출시 인수 현황'})).toHaveCount(0);
 const endpoint='/api/admin/operations/initial';await context.clearCookies();expect((await context.request.get(endpoint)).status()).toBe(403);
 await signIn(context,'admin');await page.goto('/admin/operations');await expect(page.getByRole('region',{name:'우선 처리 업무'})).toBeVisible();await page.route('**/api/admin/operations/initial',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'QA unavailable'})}));await page.getByRole('button',{name:'최신 운영 상태 불러오기',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'조회 불가'})).toContainText('QA unavailable');await expect(page.getByRole('region',{name:'우선 처리 업무'})).toHaveCount(0);
 const state=await(await request.get('http://127.0.0.1:4011/__state')).json();expect(state.documentEmails).toHaveLength(0);expect(state.emails).toHaveLength(0);
});

test('operating registration saves PI without RFQ, preserves conflicting input and respects roles',async({page,context,request},info)=>{
 await signIn(context,'admin');await page.setViewportSize({width:360,height:900});await page.goto('/admin/settings#pi-issuer');
 const form=page.locator('#pi-issuer');await expect(form.getByText('저장 버전 0 · 미등록')).toBeVisible();
 await expect(page.getByRole('link',{name:'국내 실제 완료 주문 인수',exact:true})).toHaveAttribute('href','/admin/handover#handover-domestic');
 await expect(page.getByRole('link',{name:'해외 실제 수락 PI 인수',exact:true})).toHaveAttribute('href','/admin/handover#handover-export');
 const other=await context.newPage();await isolated(other);await other.goto('/admin/settings#pi-issuer');await expect(other.locator('#pi-issuer').getByText('저장 버전 0 · 미등록')).toBeVisible();
 const fields={'PI 판매자 법적 명칭':'QA ONLY Seller','PI 판매자 주소':'QA ONLY address','PI 판매자 이메일':'seller@example.invalid','PI 판매자 연락처':'QA ONLY phone','PI 결제 조건':'QA ONLY no real payment','PI 은행·예금주·계좌·SWIFT 등 송금정보':'QA ONLY no real account'};
 for(const [label,value]of Object.entries(fields)){await form.getByLabel(label+' *',{exact:true}).fill(value);await other.locator('#pi-issuer').getByLabel(label+' *',{exact:true}).fill(value);}
 await form.getByRole('button',{name:'PI 기본정보 저장',exact:true}).click();await expect(form.getByRole('status')).toContainText('저장했습니다');
 await other.locator('#pi-issuer').getByLabel('PI 판매자 법적 명칭 *',{exact:true}).fill('QA ONLY conflicting edit');
 await other.locator('#pi-issuer').getByRole('button',{name:'PI 기본정보 저장',exact:true}).click();
 await expect(other.locator('#pi-issuer [role="alert"]')).toBeFocused();await expect(other.locator('#pi-issuer').getByLabel('PI 판매자 법적 명칭 *',{exact:true})).toHaveValue('QA ONLY conflicting edit');
 await expect(other.locator('#pi-issuer').getByRole('button',{name:'PI 기본정보 저장',exact:true})).toBeDisabled();
 await other.locator('#pi-issuer').getByRole('button',{name:'저장된 PI 정보 다시 불러오기'}).click();await expect(other.locator('#pi-issuer').getByLabel('PI 판매자 법적 명칭 *',{exact:true})).toHaveValue('QA ONLY Seller');await other.close();
 for(const width of [360,390,768,1440]){await page.setViewportSize({width,height:900});await noOverflow(page);await accessible(page);}
 await page.setViewportSize({width:360,height:900});await form.screenshot({path:info.outputPath('pi-registration-360.png')});
 const state=await(await request.get('http://127.0.0.1:4011/__state')).json();expect(state.piSettings.revision).toBe(1);expect(state.records).toHaveLength(0);expect(state.documentEmails).toHaveLength(0);expect(state.emails).toHaveLength(0);expect(state.handoverEvents).toHaveLength(0);
 expect((await request.put('/api/admin/pi/settings',{headers:{Origin:'https://foreign.invalid'},data:{revision:1,seller:state.piSettings.data}})).status()).toBe(403);
 await page.route('**/api/admin/pi/settings',r=>r.fulfill({status:503,json:{error:'판매자 설정 조회 실패'}}));await form.getByRole('button',{name:'저장된 PI 정보 다시 불러오기'}).click();await expect(form.locator('form')).toHaveCount(0);await expect(form.locator('[role="alert"]')).toBeFocused();
 await page.unroute('**/api/admin/pi/settings');await page.goto('/admin/orders#bank-settings');await expect(page.locator('#bank-settings')).toHaveAttribute('open','');await expect(page.getByLabel('은행명',{exact:true})).toBeVisible();
 await context.clearCookies();await signIn(context,'product_staff');await page.goto('/admin/settings');await expect(page.locator('#pi-issuer')).toHaveCount(0);expect((await request.get('/api/admin/pi/settings')).status()).toBe(403);
});
