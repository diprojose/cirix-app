/**
 * Shared name of the httpOnly session cookie. Kept in its own tiny module so
 * both the server (route handler, DAL) and the edge-side proxy can reference it
 * without pulling in the Admin SDK.
 */
export const SESSION_COOKIE_NAME = "session";
