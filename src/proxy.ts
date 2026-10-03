import {NextResponse, type NextRequest} from 'next/server';
import {localeOf,koreanOnlyPath} from '@/lib/i18n/locale';
export function proxy(request: NextRequest) {
  const admin = request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/');
  const explicit = request.nextUrl.searchParams.get('lang');
  if (!admin && koreanOnlyPath(request.nextUrl.pathname) && explicit !== 'ko') {
    const url=request.nextUrl.clone();url.searchParams.set('lang','ko');return NextResponse.redirect(url);
  }
  const locale = koreanOnlyPath(request.nextUrl.pathname) ? 'ko' : localeOf(explicit ?? request.cookies.get('sf_locale')?.value);
  const headers = new Headers(request.headers);
  // Overwrite untrusted incoming values; these headers are only rendering hints, never authorization.
  headers.set('x-songfood-locale', locale);
  headers.set('x-songfood-path', request.nextUrl.pathname);
  const response = NextResponse.next({request:{headers}});
  response.headers.set('Content-Language', locale);
  if (!koreanOnlyPath(request.nextUrl.pathname) && explicit !== null) response.cookies.set('sf_locale', locale,
    {path:'/',sameSite:'lax',secure:request.nextUrl.protocol === 'https:',maxAge:31536000});
  return response;
}
export const config = {matcher:['/((?!api|_next|.*\\..*).*)']};
