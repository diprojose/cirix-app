/**
 * The kinds of session the platform issues, by what the account may do:
 * - `platform`: an account an administrator admitted; opens the private modules.
 * - `reviews`: any verified account; opens only the Google review entry.
 * - `member`: any verified account; opens the customer and business areas, where
 *   each page and API still authorizes the person against a specific business.
 *
 * Kept free of server-only imports so browser code can share the same type.
 */
export type SessionAudience = "platform" | "reviews" | "member";

/** Narrows untrusted input to a known audience, defaulting to the strictest. */
export function parseAudience(value: unknown): SessionAudience {
  return value === "reviews" || value === "member" ? value : "platform";
}
