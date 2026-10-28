/**
 * Maps a tenancy error code to an HTTP status. Kept free of server-only imports
 * so it can be tested on its own. Unknown codes are treated as a denial, never
 * as success, so a new error can only ever fail closed.
 */
export function statusForTenancyError(code: string): number {
  switch (code) {
    case "tenancy/not-found":
    case "tenancy/member-not-found":
      return 404;
    case "tenancy/invalid-membership":
      return 400;
    case "tenancy/last-owner":
    case "tenancy/team-full":
    case "tenancy/account-disabled":
      return 409;
    case "tenancy/access-denied":
    case "tenancy/suspended":
    case "tenancy/team-change-denied":
      return 403;
    default:
      return 403;
  }
}
