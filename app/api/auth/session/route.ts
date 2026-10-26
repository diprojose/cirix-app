import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  makeCreateSession,
  makeGetViewer,
  makeRevokeSession,
  makeCreateReviewSession,
  makeGetReviewViewer,
  makeCreateMemberSession,
  makeGetMemberViewer,
} from "@/core/iam/infrastructure/di/iam-container";
import { parseAudience, type SessionAudience } from "@/lib/auth/audience";
import { makeRegisterReferral } from "@/modules/loyalty/referrals/infrastructure/di/referrals-container";
import { adminAuth } from "@/shared/infrastructure/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { REFERRAL_COOKIE_NAME } from "@/lib/referrals/referral-cookie";

/** The session use case matching the kind of sign-in being exchanged. */
function createSessionFor(audience: SessionAudience) {
  if (audience === "reviews") return makeCreateReviewSession();
  if (audience === "member") return makeCreateMemberSession();
  return makeCreateSession();
}

/** The viewer use case that must agree with {@link createSessionFor}. */
function viewerFor(audience: SessionAudience) {
  if (audience === "reviews") return makeGetReviewViewer();
  if (audience === "member") return makeGetMemberViewer();
  return makeGetViewer();
}

/** A referral only binds if the account was created this recently (a fresh signup). */
const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

// Session handling must never be cached or statically evaluated, and needs the
// Node.js runtime for the Firebase Admin SDK.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/auth/session — exchanges a client Firebase id token for an httpOnly
 * session cookie. The body is `{ idToken: string, audience?: "platform" | "reviews" | "member" }`.
 * Review and member sessions authenticate identity only: private modules still
 * check admission, and business data still checks membership in that business.
 * Domain errors are mapped
 * to a plain `{ code, message }` shape before crossing to the client.
 *
 * The response carries a `landing` path: the role is only known once the
 * session exists, so the login screen cannot compute it before signing in. An
 * operator is sent to the admin panel; other admitted users to the landing.
 */
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: { code: "iam/invalid-origin" } }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as {
    idToken?: unknown;
    audience?: unknown;
  } | null;
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";

  const audience = parseAudience(body?.audience);
  const result = await createSessionFor(audience).execute({ idToken });
  if (!result.ok) {
    (await cookies()).delete(SESSION_COOKIE_NAME);
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status: result.error.code === "iam/access-denied" ? 403 : 401 }
    );
  }

  const viewer = await viewerFor(audience).execute({ sessionCookie: result.value.cookie });
  if (!viewer.ok || !viewer.value.authenticated) {
    (await cookies()).delete(SESSION_COOKIE_NAME);
    return NextResponse.json({ error: { code: "iam/access-denied" } }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, result.value.cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(result.value.expiresAt),
  });

  if (audience === "platform") await bindPendingReferral(idToken, cookieStore);

  // Resolve the viewer from the freshly minted cookie rather than from the
  // request's cookie jar: the DAL's `getViewer` is memoised per render pass and
  // would not see a cookie set in this very handler.
  const landing =
    audience === "reviews"
      ? "/make-a-review"
      : audience === "member"
        ? "/me"
        : viewer.value.permissions.canOperateStore ? "/admin" : "/";

  return NextResponse.json({ ok: true, landing });
}

/**
 * If the visitor arrived through a referral link and this is a brand-new account,
 * binds them to the referrer (US-D2). Strictly best-effort — it never blocks
 * login — and it only binds fresh signups so an existing customer clicking a
 * friend's link is not retroactively counted as a referral. The code cookie is
 * consumed either way.
 */
async function bindPendingReferral(
  idToken: string,
  cookieStore: Awaited<ReturnType<typeof cookies>>
): Promise<void> {
  const code = cookieStore.get(REFERRAL_COOKIE_NAME)?.value;
  if (!code) {
    return;
  }

  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    const user = await adminAuth().getUser(decoded.uid);
    const createdMs = Date.parse(user.metadata.creationTime);
    const isNewAccount =
      Number.isFinite(createdMs) && Date.now() - createdMs < NEW_ACCOUNT_WINDOW_MS;
    if (isNewAccount) {
      await makeRegisterReferral().execute({ referredUid: decoded.uid, code });
    }
  } catch {
    // Referral binding must never fail the login flow.
  } finally {
    cookieStore.delete(REFERRAL_COOKIE_NAME);
  }
}

/**
 * DELETE /api/auth/session — logs out: best-effort revokes the session at the
 * provider and clears the cookie.
 */
export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: { code: "iam/invalid-origin" } }, { status: 403 });
  }
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;

  await makeRevokeSession().execute({ sessionCookie });
  cookieStore.delete(SESSION_COOKIE_NAME);

  return NextResponse.json({ ok: true });
}
