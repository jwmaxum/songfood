import type { Page } from '@playwright/test';
export const MEDIA_TEST_ORIGIN = 'https://media.qa.invalid';
const fixtureOrigin = 'http://127.0.0.1:4011';
function mediaUrl(value: unknown): unknown {
 if (typeof value !== 'string') return value;
 try { const url = new URL(value); return url.origin === fixtureOrigin && url.pathname.startsWith('/storage/v1/object/public/media/') ? MEDIA_TEST_ORIGIN + url.pathname : value; } catch { return value; }
}
/** Only the upload response boundary uses HTTPS test URLs; real bytes still use the loopback fixture. */
export async function installMediaUploadProxy(page: Page) {
 await page.route(url => url.origin === MEDIA_TEST_ORIGIN && url.pathname.startsWith('/storage/v1/object/public/media/'), async route => {
  const url = new URL(route.request().url());
  const response = await route.fetch({ url: fixtureOrigin + url.pathname });
  await route.fulfill({ response });
 });
 await page.route(url => url.pathname === '/api/upload', async route => {
  if (route.request().method() !== 'POST') return route.continue();
  const response = await route.fetch(), body = await response.json();
  if (body?.success && body.data) body.data.url = mediaUrl(body.data.url);
  await route.fulfill({ response, json: body });
 });
 await page.route(url => url.pathname === '/api/media', async route => {
  if (route.request().method() !== 'GET') return route.continue();
  const response = await route.fetch(), body = await response.json();
  if (body?.success && Array.isArray(body.data)) body.data = body.data.map((item: Record<string, unknown>) => ({ ...item, url: mediaUrl(item.url) }));
  await route.fulfill({ response, json: body });
 });
}
