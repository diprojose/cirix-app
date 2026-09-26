import { NextResponse, type NextRequest } from "next/server";
import { makeGetViewer, makeGetReviewViewer } from "@/core/iam/infrastructure/di/iam-container";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { isPublicAsset, isPublicPage, isReviewPage, isServiceEndpoint } from "@/lib/auth/route-access";
import { DEFAULT_LOCALE, detectPreferredLocale, localizeHref, stripLocaleFromPathname } from "@/lib/locale";
import { SITE_URL } from "@/lib/site-metadata";

/** Default-deny access boundary. API handlers and server actions also check the DAL. */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const readOnly = request.method === "GET" || request.method === "HEAD";
  const isAction = request.headers.has("next-action");
  if ((readOnly && !isAction && isPublicAsset(pathname)) || isServiceEndpoint(pathname)) {
    return NextResponse.next();
  }

  const { locale, pathname: barePathname } = stripLocaleFromPathname(pathname);
  // Keep the public entry point consistently English for visitors and crawlers.
  const resolvedLocale = locale ?? (pathname === "/" ? DEFAULT_LOCALE : detectPreferredLocale(request.headers.get("accept-language")));
  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  const publicPage = readOnly && !isAction && isPublicPage(barePathname);

  // Consolidate indexable landing variants in one permanent hop. Keep preview
  // and local origins intact, and leave actions/auth/service endpoints alone.
  if (publicPage && barePathname === "/") {
    const canonicalOrigin = new URL(SITE_URL);
    const redirectUrl = request.nextUrl.clone();
    if (redirectUrl.hostname === canonicalOrigin.hostname || redirectUrl.hostname === "cirixadv.com") {
      redirectUrl.protocol = canonicalOrigin.protocol;
      redirectUrl.host = canonicalOrigin.host;
    }
    redirectUrl.pathname = localizeHref(resolvedLocale, "/");
    if (redirectUrl.href !== request.nextUrl.href) {
      return NextResponse.redirect(redirectUrl, 308);
    }
  }

  if (!publicPage) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
    const reviewPage = readOnly && !isAction && isReviewPage(barePathname);
    const viewer = await (reviewPage ? makeGetReviewViewer() : makeGetViewer()).execute({ sessionCookie });
    if (!viewer.ok || !viewer.value.authenticated) {
      if (isApi || !readOnly) {
        return NextResponse.json({ error: { code: "iam/access-denied", message: "Authorized account required." } }, {
          status: 401, headers: { "Cache-Control": "no-store" },
        });
      }
      const loginUrl = new URL(localizeHref(resolvedLocale, "/login"), request.url);
      loginUrl.searchParams.set("from", pathname + request.nextUrl.search);
      const response = NextResponse.redirect(loginUrl);
      response.headers.set("Cache-Control", "no-store");
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }

  if (isApi) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  if (!locale) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = localizeHref(resolvedLocale, pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-mixmag-locale", resolvedLocale);
  requestHeaders.set("x-mixmag-pathname", barePathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (!publicPage) response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  // Do not exempt arbitrary file extensions: dynamic routes may contain them.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
