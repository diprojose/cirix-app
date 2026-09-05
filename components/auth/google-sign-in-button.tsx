"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { useLocale } from "@/components/locale-provider";
import {
  getFirebaseAuth,
  hasFirebaseClientConfig,
} from "@/lib/firebase/client";
import { localizeHref, pick } from "@/lib/locale";

export function GoogleSignInButton({
  redirectTo = null,
}: {
  redirectTo?: string | null;
}) {
  const router = useRouter();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);

    try {
      const { auth, googleProvider } = getFirebaseAuth();
      const credential = await signInWithPopup(auth, googleProvider);
      const idToken = await credential.user.getIdToken();

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) {
        throw new Error(
          pick(locale, {
            es: "No se pudo iniciar la sesión. Intenta de nuevo.",
            en: "We couldn't sign you in. Try again.",
          })
        );
      }

      const payload = (await response.json().catch(() => null)) as {
        landing?: unknown;
      } | null;
      const landing =
        typeof payload?.landing === "string" && payload.landing.startsWith("/")
          ? payload.landing
          : "/";

      router.refresh();
      router.push(redirectTo ?? localizeHref(locale, landing));
    } catch (caught) {
      setError(
        caught instanceof Error
            ? caught.message
            : pick(locale, {
              es: "Ocurrió un error al iniciar sesión.",
              en: "There was an error signing you in.",
            })
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading || !hasFirebaseClientConfig}
        aria-describedby={!hasFirebaseClientConfig ? "firebase-login-help" : undefined}
        className="flex min-h-11 w-full items-center justify-center gap-3 rounded-pill border border-border bg-surface px-5 py-3 text-label font-medium text-text shadow-xs transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none"
      >
        <GoogleGlyph />
        {loading
          ? pick(locale, { es: "Conectando...", en: "Connecting..." })
          : pick(locale, {
              es: "Continuar con Google",
              en: "Continue with Google",
            })}
      </button>
      {!hasFirebaseClientConfig && (
        <p id="firebase-login-help" className="text-label leading-relaxed text-text-muted">
          {pick(locale, {
            es: "Conecta Firebase para habilitar el acceso; el demo público sigue disponible sin iniciar sesión.",
            en: "Connect Firebase to enable sign-in; the public demo remains available without an account.",
          })}
        </p>
      )}
      {error && (
        <p role="alert" className="text-label text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
