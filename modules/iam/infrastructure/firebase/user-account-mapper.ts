import type { DecodedIdToken } from "firebase-admin/auth";
import { UserAccount } from "../../domain/entities/user-account";

/**
 * Maps a Firebase decoded session token to a domain {@link UserAccount}. The
 * operator tier comes from the `operator` custom claim or from the
 * `OPERATOR_EMAILS` env whitelist (the bootstrap path — someone must be
 * operator before any claim can be granted). Returns `null` when the token
 * lacks the data required to build a valid account (e.g. no email), which the
 * caller treats as an unauthenticated guest.
 */
export function toUserAccount(decoded: DecodedIdToken): UserAccount | null {
  if (!decoded.email) {
    return null;
  }

  const result = UserAccount.create({
    uid: decoded.uid,
    email: decoded.email,
    operator: decoded.operator === true || isWhitelistedOperator(decoded.email),
  });

  return result.ok ? result.value : null;
}

/** True when the email appears in the comma-separated `OPERATOR_EMAILS` env var. */
function isWhitelistedOperator(email: string): boolean {
  const whitelist = process.env.OPERATOR_EMAILS ?? "";
  return whitelist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0)
    .includes(email.toLowerCase());
}
