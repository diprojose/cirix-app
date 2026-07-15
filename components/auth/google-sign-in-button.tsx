"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";

/**
 * Client component that runs the Google sign-in flow: it opens the provider
 * popup, exchanges the resulting id token for a server session cookie via
 * `POST /api/auth/session`, then navigates to `redirectTo`. First-time users are
 * registered by Firebase automatically. Renders its own loading/error state.
 */
export function GoogleSignInButton({
  redirectTo = "/",
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const idToken = await credential.user.getIdToken();

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) {
        throw new Error("No se pudo iniciar la sesión. Intenta de nuevo.");
      }

      router.push(redirectTo);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Ocurrió un error al iniciar sesión."
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className="flex min-h-[44px] w-full items-center justify-center gap-3 rounded-full border border-black/[.12] bg-white px-5 py-3 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-white/[.16] dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
      >
        <GoogleGlyph />
        {loading ? "Conectando…" : "Continuar con Google"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Google "G" logomark, inline so it needs no network request or asset. */
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
