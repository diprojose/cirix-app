import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { REFERRAL_COOKIE_NAME } from "@/lib/referrals/referral-cookie";

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

  return NextResponse.redirect(new URL("/", request.url));
}
