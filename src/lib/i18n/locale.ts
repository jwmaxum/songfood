export type Locale = 'ko' | 'en';
export function localeOf(value: unknown): Locale { return value === 'en' ? 'en' : 'ko'; }
export const koreanOnlyPath = (path:string) => /^\/(?:admin|checkout|account\/orders)(?:\/|$)/.test(path);
export function localizedHref(href: string, locale: Locale): string {
  if (!href.startsWith('/') || href.startsWith('//') || /^\/(?:api|admin)(?:\/|\?|$)/.test(href)) return href;
  const url = new URL(href, 'https://songfood.invalid');
  url.searchParams.set('lang', koreanOnlyPath(url.pathname)?'ko':locale);
  return url.pathname + url.search + url.hash;
}
export function localeFromRequest(request: Request): Locale {
  const explicit = new URL(request.url).searchParams.get('lang');
  if (explicit !== null) return localeOf(explicit);
  return localeOf(request.headers.get('cookie')?.match(/(?:^|;\s*)sf_locale=(ko|en)(?:;|$)/)?.[1]);
}
export const localeText = (locale: Locale, ko: string, en: string) => locale === 'en' ? en : ko;
export function displayDate(value: string, locale: Locale) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ko-KR',
    {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
