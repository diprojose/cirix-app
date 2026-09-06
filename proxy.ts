import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import {
  DEFAULT_LOCALE,
  detectPreferredLocale,
  hasLocale,
  localizeHref,
  stripLocaleFromPathname,
} from "@/lib/locale";

/*
 * Proxy (formerly "middleware" — renamed in Next.js 16). Performs an OPTIMISTIC
 * access check only: it looks for the presence of the session cookie and
 * redirects anonymous visitors away from private routes. It deliberately does
 * NOT verify the cookie's signature or read claims — that authoritative check
 * lives in the DAL (lib/auth/dal.ts), close to the data. `/admin` in particular
 * is only bounced here for guests; that a session exists says nothing about the
 * operator role, which `requireOperator()` re-checks on every page and action.
 */

// Route prefixes that require at least a signed-in user. `/cart`, `/checkout`
// and `/orders` are absent on purpose: guests may fill a cart, check out and
// see their order confirmation without an account.
const PRIVATE_PREFIXES = [
  "/admin",
  "/billetera",
  "/referidos",
  "/notificaciones",
];

function isPrivate(pathname: string): boolean {
  return (
    PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const { locale, pathname: barePathname } = stripLocaleFromPathname(pathname);
  const resolvedLocale =
    locale ?? detectPreferredLocale(request.headers.get("accept-language"));

  if (!locale) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = localizeHref(resolvedLocale, pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isPrivate(barePathname)) {
    const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!hasSession) {
      const demoMatch = barePathname.match(/^\/demo\/([^/]+)\//);
      const loginPath = demoMatch ? `/demo/${demoMatch[1]}/login` : "/login";
      const loginUrl = new URL(localizeHref(resolvedLocale, loginPath), request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-mixmag-locale", hasLocale(resolvedLocale) ? resolvedLocale : DEFAULT_LOCALE);
  requestHeaders.set("x-mixmag-pathname", barePathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Run on everything except API routes, Next internals and static assets.
  matcher: [
    "/((?!api(?:/|$)|_next/static|_next/image|offline(?:/|$)|.*\\.(?:avif|bmp|css|eot|gif|ico|jpeg|jpg|js|json|map|mjs|mp3|mp4|ogg|otf|pdf|png|svg|tif|tiff|txt|wasm|wav|webm|webmanifest|webp|woff|woff2|xml)$).*)",
  ],
};
