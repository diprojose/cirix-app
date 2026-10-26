import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type GoogleAuthProvider,
  type UserCredential,
} from "firebase/auth";
import { exchangeFirebaseSession } from "./session";
import type { SessionAudience } from "@/lib/auth/audience";
export { SessionExchangeError } from "./session";

export function prefersGoogleRedirect(browser: {
  userAgent: string;
  maxTouchPoints: number;
}): boolean {
  return /Android|iPhone|iPad|iPod/i.test(browser.userAgent) ||
    (/Macintosh/i.test(browser.userAgent) && browser.maxTouchPoints > 1);
}

export function firebaseErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error &&
    typeof error.code === "string" ? error.code : undefined;
}

export async function startGoogleSignIn(
  auth: Auth,
  provider: GoogleAuthProvider,
  options: { prefersRedirect: boolean; origin: string },
): Promise<UserCredential | null> {
  // Cross-origin redirects can silently lose their result when third-party
  // storage is blocked. Only use redirects with the same-origin auth helper.
  const redirectAvailable = auth.config.authDomain !== undefined &&
    `https://${auth.config.authDomain}` === options.origin;
  provider.setCustomParameters({ prompt: "select_account" });
  if (options.prefersRedirect && redirectAvailable) {
    await signInWithRedirect(auth, provider);
    return null;
  }

  try {
    // No asynchronous work before opening the desktop popup.
    return await signInWithPopup(auth, provider);
  } catch (error) {
    if (firebaseErrorCode(error) !== "auth/popup-blocked" || !redirectAvailable) throw error;
    await signInWithRedirect(auth, provider);
    return null;
  }
}

// React Strict Mode can subscribe twice; Firebase consumes the redirect result.
const redirectResults = new WeakMap<Auth, Promise<UserCredential | null>>();
export function resumeGoogleSignIn(auth: Auth): Promise<UserCredential | null> {
  let result = redirectResults.get(auth);
  if (!result) {
    result = getRedirectResult(auth);
    redirectResults.set(auth, result);
  }
  return result;
}

export async function exchangeGoogleSession(
  auth: Auth,
  credential: UserCredential,
  audience: SessionAudience,
): Promise<string> {
  try {
    return await exchangeFirebaseSession(auth, credential, audience);
  } finally {
    redirectResults.delete(auth);
  }
}
