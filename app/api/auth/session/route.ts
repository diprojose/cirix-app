import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  makeCreateSession,
  makeRevokeSession,
} from "@/modules/iam/infrastructure/di/iam-container";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";

// Session handling must never be cached or statically evaluated, and needs the
// Node.js runtime for the Firebase Admin SDK.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/auth/session — exchanges a client Firebase id token for an httpOnly
 * session cookie. The body is `{ idToken: string }`. Domain errors are mapped
 * to a plain `{ code, message }` shape before crossing to the client.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    idToken?: unknown;
  } | null;
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";

  const result = await makeCreateSession().execute({ idToken });
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status: 401 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, result.value.cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(result.value.expiresAt),
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/auth/session — logs out: best-effort revokes the session at the
 * provider and clears the cookie.
 */
export async function DELETE() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;

  await makeRevokeSession().execute({ sessionCookie });
  cookieStore.delete(SESSION_COOKIE_NAME);

  return NextResponse.json({ ok: true });
}
