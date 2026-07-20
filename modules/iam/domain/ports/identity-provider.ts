import type { UserAccount } from "../entities/user-account";
import type { UserId } from "../value-objects/user-id";

/** A minted session cookie together with its absolute expiry (epoch millis). */
export type MintedSession = {
  cookie: string;
  expiresAt: number;
};

/**
 * IdentityProvider is the port to the external identity system (Firebase
 * Authentication). Unlike a repository, it does not persist an aggregate of
 * ours — it is a gateway that mints and verifies sessions and manages the
 * subscription claim. The domain declares this contract; an infrastructure
 * adapter implements it, so the application layer never depends on Firebase and
 * the provider can be swapped without touching domain or application code.
 */
export interface IdentityProvider {
  /**
   * Verifies a session cookie and returns the authenticated {@link UserAccount},
   * or `null` when the cookie is absent, malformed, expired or revoked.
   */
  verifySession(sessionCookie: string): Promise<UserAccount | null>;

  /**
   * Exchanges a freshly obtained client id token for a server session cookie.
   * @param idToken the Firebase id token produced by the client SDK.
   * @param expiresInMs desired session lifetime, in milliseconds.
   */
  createSession(idToken: string, expiresInMs: number): Promise<MintedSession>;

  /** Revokes the refresh tokens behind a session so it can no longer be renewed. */
  revokeSession(sessionCookie: string): Promise<void>;

  /**
   * Grants the premium subscription claim to a user until the given moment
   * (operator action). Granting again replaces the expiry.
   */
  grantPremium(userId: UserId, until: Date): Promise<void>;

  /** Removes the premium subscription claim from a user (operator action). */
  revokePremium(userId: UserId): Promise<void>;

  /**
   * Returns when the user's premium currently expires, or `null` when they
   * hold no premium claim. Used to extend (rather than reset) on renewal.
   */
  getPremiumExpiry(userId: UserId): Promise<Date | null>;

  /**
   * Resolves the id of the registered user holding the given email, or `null`
   * when no account exists (operator actions target users by email).
   */
  findUserIdByEmail(email: string): Promise<UserId | null>;
}
