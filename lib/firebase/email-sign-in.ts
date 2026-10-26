import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  type Auth,
} from "firebase/auth";
import { z } from "zod";
import { safeInternalPath } from "@/lib/auth/return-path";
import type { SessionAudience } from "@/lib/auth/audience";
import { localizeHref, type Locale } from "@/lib/locale";
import { exchangeFirebaseSession } from "./session";

const emailInput = z.string().trim().email().max(254);
const EMAIL_STORAGE_KEY = "cirix.email-sign-in";
const EMAIL_RETENTION_MS = 24 * 60 * 60 * 1000;

export function parseSignInEmail(value: string): string {
  const result = emailInput.safeParse(value);
  if (!result.success) throw Object.assign(new Error("Invalid email"), { code: "auth/invalid-email" });
  return result.data;
}

export function emailSignInReturnUrl(origin: string, locale: Locale, redirectTo: string | null): string {
  const url = new URL(localizeHref(locale, "/login"), origin);
  url.searchParams.set("emailSignIn", "1");
  const destination = safeInternalPath(redirectTo);
  if (destination) url.searchParams.set("from", destination);
  // Never put the email in this URL: Firebase must verify the address supplied
  // independently by this browser or by the person opening the link.
  return url.href;
}

export function rememberedSignInEmail(): string {
  try {
    const saved = JSON.parse(window.localStorage.getItem(EMAIL_STORAGE_KEY) ?? "null");
    if (saved && typeof saved.expiresAt === "number" && saved.expiresAt > Date.now()) {
      return parseSignInEmail(saved.email);
    }
    forgetSignInEmail();
  } catch {
    // Storage can be blocked; asking for the address still completes sign-in.
  }
  return "";
}

export function forgetSignInEmail(): void {
  try { window.localStorage.removeItem(EMAIL_STORAGE_KEY); } catch { /* Optional convenience only. */ }
}

export async function requestEmailSignIn(
  auth: Auth,
  value: string,
  options: { origin: string; locale: Locale; redirectTo: string | null },
): Promise<string> {
  const email = parseSignInEmail(value);
  auth.languageCode = options.locale;
  await sendSignInLinkToEmail(auth, email, {
    url: emailSignInReturnUrl(options.origin, options.locale, options.redirectTo),
    handleCodeInApp: true,
  });
  try {
    window.localStorage.setItem(EMAIL_STORAGE_KEY, JSON.stringify({
      email, expiresAt: Date.now() + EMAIL_RETENTION_MS,
    }));
  } catch { /* The link also works in another browser or with storage blocked. */ }
  return email;
}

export async function completeEmailSignIn(
  auth: Auth,
  value: string,
  link: string,
  audience: SessionAudience,
): Promise<string> {
  const email = parseSignInEmail(value);
  if (!isSignInWithEmailLink(auth, link)) {
    throw Object.assign(new Error("Invalid sign-in link"), { code: "auth/invalid-action-code" });
  }
  // Firebase checks that the email matches the single-use code before issuing
  // a verified ID token. A typed address alone never creates a server session.
  const credential = await signInWithEmailLink(auth, email, link);
  forgetSignInEmail();
  return exchangeFirebaseSession(auth, credential, audience);
}
