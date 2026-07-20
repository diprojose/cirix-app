import "server-only";
import type { UserAccount } from "../../domain/entities/user-account";
import { UserId } from "../../domain/value-objects/user-id";
import type {
  IdentityProvider,
  MintedSession,
} from "../../domain/ports/identity-provider";
import { adminAuth } from "@/shared/infrastructure/firebase-admin";
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

  async grantPremium(userId: UserId, until: Date): Promise<void> {
    // setCustomUserClaims replaces the whole claim object — merge to preserve
    // unrelated claims (e.g. `operator`).
    const existing = (await adminAuth().getUser(userId.value)).customClaims ?? {};
    await adminAuth().setCustomUserClaims(userId.value, {
      ...existing,
      premium: true,
      premiumUntil: until.getTime(),
    });
  }

  async revokePremium(userId: UserId): Promise<void> {
    const existing = (await adminAuth().getUser(userId.value)).customClaims ?? {};
    await adminAuth().setCustomUserClaims(userId.value, {
      ...existing,
      premium: false,
      premiumUntil: null,
    });
  }

  async getPremiumExpiry(userId: UserId): Promise<Date | null> {
    const claims = (await adminAuth().getUser(userId.value)).customClaims ?? {};
    const until = claims.premiumUntil;
    return typeof until === "number" ? new Date(until) : null;
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
