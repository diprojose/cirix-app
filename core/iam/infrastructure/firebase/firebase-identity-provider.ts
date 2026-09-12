import "server-only";
import type { UserAccount } from "../../domain/entities/user-account";
import { UserId } from "../../domain/value-objects/user-id";
import type {
  IdentityProvider,
  MintedSession,
} from "../../domain/ports/identity-provider";
import { adminAuth } from "@/shared/infrastructure/firebase-admin";
import { toUserAccount } from "./user-account-mapper";
import { hasPlatformAccess } from "./platform-access";
import { PlatformAccessDeniedError } from "../../domain/errors/iam-errors";

/**
 * Firebase-backed adapter implementing {@link IdentityProvider}. It is the only
 * place that talks to the Admin Auth SDK: it mints and verifies session cookies
 * and resolves users by email. Swapping identity providers means replacing this
 * adapter alone — domain and application stay untouched.
 */
export class FirebaseIdentityProvider implements IdentityProvider {
  async verifySession(sessionCookie: string): Promise<UserAccount | null> {
    try {
      // `true` checks the token has not been revoked (logout, disabled user).
      const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
      const user = await adminAuth().getUser(decoded.uid);
      if (!hasPlatformAccess(user)) return null;
      // Read current admission and role, never stale claims in a 14-day cookie.
      return toUserAccount({
        ...decoded,
        email: user.email,
        operator: user.customClaims?.operator === true,
      });
    } catch {
      // Absent, malformed, expired or revoked cookie → treat as guest.
      return null;
    }
  }

  async createSession(
    idToken: string,
    expiresInMs: number
  ): Promise<MintedSession> {
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    const user = await adminAuth().getUser(decoded.uid);
    if (!decoded.email_verified || !hasPlatformAccess(user)) {
      throw new PlatformAccessDeniedError();
    }
    const secondsSinceSignIn = Date.now() / 1000 - decoded.auth_time;
    if (!Number.isFinite(secondsSinceSignIn) || secondsSinceSignIn < -60 || secondsSinceSignIn > 300) {
      throw new Error("A recent sign-in is required.");
    }
    const cookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: expiresInMs,
    });
    return { cookie, expiresAt: Date.now() + expiresInMs };
  }

  async revokeSession(sessionCookie: string): Promise<void> {
    // Resolve the cookie to its user, then revoke that user's refresh tokens.
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, false);
    await adminAuth().revokeRefreshTokens(decoded.sub);
  }

  async findUserIdByEmail(email: string): Promise<UserId | null> {
    try {
      const user = await adminAuth().getUserByEmail(email);
      return UserId.from(user.uid);
    } catch {
      // Firebase throws auth/user-not-found for unknown emails.
      return null;
    }
  }
}
