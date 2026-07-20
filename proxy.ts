import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";

/*
 * Proxy (formerly "middleware" — renamed in Next.js 16). Performs an OPTIMISTIC
 * access check only: it looks for the presence of the session cookie and
 * redirects anonymous visitors away from private routes. It deliberately does
 * NOT verify the cookie's signature or read claims — that authoritative check
 * lives in the DAL (lib/auth/dal.ts), close to the data. Recipe/premium content
 * must always be re-checked there, never trusted from this layer alone.
 */

// Route prefixes that require at least a signed-in user.
const PRIVATE_PREFIXES = ["/premium", "/pedidos", "/recetas", "/billetera", "/referidos"];

function isPrivate(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (!isPrivate(pathname)) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except API routes, Next internals and static assets.
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$|manifest.webmanifest|sw.js|offline).*)",
  ],
};
