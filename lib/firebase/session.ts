import { signOut, type Auth, type UserCredential } from "firebase/auth";
import { safeInternalPath } from "@/lib/auth/return-path";

export class SessionExchangeError extends Error {
  constructor(readonly accessDenied: boolean) {
    super("Session exchange failed");
  }
}

/** The server verifies email ownership and admission for either sign-in method. */
export async function exchangeFirebaseSession(
  auth: Auth,
  credential: UserCredential,
  audience: "reviews" | "platform",
): Promise<string> {
  try {
    const idToken = await credential.user.getIdToken();
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, audience }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new SessionExchangeError(payload?.error?.code === "iam/access-denied");
    }
    return safeInternalPath(payload?.landing) ?? "/";
  } finally {
    // Only the httpOnly server session is retained, including after rejection.
    await signOut(auth).catch(() => {});
  }
}
