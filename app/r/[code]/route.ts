import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  detectPreferredLocale,
  localizeHref,
  stripLocaleFromPathname,
} from "@/lib/locale";
import { REFERRAL_COOKIE_NAME } from "@/lib/referrals/referral-cookie";
import { getBrandProfile } from "@/modules/loyalty/branding/infrastructure/branding-container";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** How long a captured referral code waits for the visitor to sign up (30 days). */
const REFERRAL_TTL_SECONDS = 60 * 60 * 24 * 30;

/**
 * GET /r/[code] — the destination of a referral link. It remembers the code in a
 * short-lived cookie and sends the visitor to the storefront. Nothing is bound or
 * validated here — the code is only tied to an account (and checked against
 * self-referral) when a brand-new user signs up, in the session route.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  const { code } = await params;

  const cookieStore = await cookies();
  cookieStore.set(REFERRAL_COOKIE_NAME, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFERRAL_TTL_SECONDS,
  });

  const { locale } = stripLocaleFromPathname(request.nextUrl.pathname);
  const resolvedLocale =
    locale ?? detectPreferredLocale(request.headers.get("accept-language"));
  const requestedBrand = request.nextUrl.searchParams.get("brand") ?? "";
  const brand = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedBrand)
    ? await getBrandProfile(requestedBrand)
    : null;
  const destination = brand?.active
    ? `/demo/${brand.slug}/home`
    : "/loyalty";
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = localizeHref(resolvedLocale, destination);
  redirectUrl.search = "";

  return NextResponse.redirect(redirectUrl);
}
