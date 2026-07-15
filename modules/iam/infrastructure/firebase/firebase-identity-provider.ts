import "server-only";
import type { UserAccount } from "../../domain/entities/user-account";
import type { UserId } from "../../domain/value-objects/user-id";
import type {
  IdentityProvider,
  MintedSession,
} from "../../domain/ports/identity-provider";
import { adminAuth } from "./firebase-admin";
import { toUserAccount } from "./user-account-mapper";

/**
 * Firebase-backed adapter implementing {@link IdentityProvider}. It is the only
 * place that talks to the Admin Auth SDK: it mints and verifies session
 * cookies and manages the `premium` custom claim. Swapping identity providers
 * means replacing this adapter alone — domain and application stay untouched.
 */
export class FirebaseIdentityProvider implements IdentityProvider {
  async verifySession(sessionCookie: string): Promise<UserAccount | null> {
    try {
      // `true` checks the token has not been revoked (logout, disabled user).
      const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
      return toUserAccount(decoded);
    } catch {
      // Absent, malformed, expired or revoked cookie → treat as guest.
      return null;
    }
  }

  async createSession(
    idToken: string,
    expiresInMs: number
  ): Promise<MintedSession> {
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

  async grantPremium(userId: UserId): Promise<void> {
    await adminAuth().setCustomUserClaims(userId.value, { premium: true });
  }

  async revokePremium(userId: UserId): Promise<void> {
    await adminAuth().setCustomUserClaims(userId.value, { premium: false });
  }
}
