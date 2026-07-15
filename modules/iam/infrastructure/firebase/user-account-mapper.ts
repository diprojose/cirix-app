import type { DecodedIdToken } from "firebase-admin/auth";
import { UserAccount } from "../../domain/entities/user-account";

/**
 * Maps a Firebase decoded session token to a domain {@link UserAccount}. The
 * premium tier is derived from the `premium` custom claim embedded in the
 * token. Returns `null` when the token lacks the data required to build a valid
 * account (e.g. no email), which the caller treats as an unauthenticated guest.
 */
export function toUserAccount(decoded: DecodedIdToken): UserAccount | null {
  if (!decoded.email) {
    return null;
  }

  const result = UserAccount.create({
    uid: decoded.uid,
    email: decoded.email,
    premium: decoded.premium === true,
  });

  return result.ok ? result.value : null;
}
