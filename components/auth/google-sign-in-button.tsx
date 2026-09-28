"use client";

import { useToast } from "@/components/toast-provider";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Auth, type UserCredential } from "firebase/auth";
import { exchangeGoogleSession, firebaseErrorCode, prefersGoogleRedirect, resumeGoogleSignIn, SessionExchangeError, startGoogleSignIn } from "@/lib/firebase/google-sign-in";
import { useLocale } from "@/components/locale-provider";
import {
  getFirebaseAuth,
  hasFirebaseClientConfig,
} from "@/lib/firebase/client";
import { localizeHref, pick } from "@/lib/locale";

export function GoogleSignInButton({
  redirectTo = null,
  reviewLogin = false,
}: {
  redirectTo?: string | null;
  reviewLogin?: boolean;
}) {
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const busy = useRef(false);
  const { error: showError } = useToast();

  const reportError = useCallback((caught: unknown) => {
    const code = firebaseErrorCode(caught);
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
    showError(caught instanceof SessionExchangeError && caught.accessDenied && !reviewLogin
      ? pick(locale, {
          es: "Esta cuenta no tiene acceso autorizado. Solicita al administrador que la habilite previamente.",
          en: "This account is not authorized. Ask your administrator to enable access first.",
        })
      : code === "auth/popup-blocked"
        ? pick(locale, {
            es: "Permite las ventanas emergentes para este sitio y vuelve a intentar. Si estás dentro de otra app, abre el enlace en Safari o Chrome.",
            en: "Allow popups for this site and try again. If you're inside another app, open the link in Safari or Chrome.",
          })
      : code === "auth/web-storage-unsupported" || code === "auth/operation-not-supported-in-this-environment"
        ? pick(locale, {
            es: "Abre este enlace en Safari o Chrome para continuar con Google.",
            en: "Open this link in Safari or Chrome to continue with Google.",
          })
        : pick(locale, {
            es: "No se pudo iniciar la sesión. Intenta de nuevo. Si abriste el enlace dentro de otra app, ábrelo en Safari o Chrome.",
            en: "We couldn't sign you in. Try again. If you opened this link inside another app, open it in Safari or Chrome.",
          }));
  }, [locale, reviewLogin, showError]);

  const completeSignIn = useCallback(async (auth: Auth, credential: UserCredential) => {
    const landing = await exchangeGoogleSession(auth, credential, reviewLogin ? "reviews" : "platform");
    // Load the destination with the new httpOnly cookie, without racing a
    // refresh of /login or reusing a route prefetched as an anonymous visitor.
    window.location.replace(redirectTo ?? localizeHref(locale, landing));
  }, [locale, redirectTo, reviewLogin]);

  useEffect(() => {
    if (!hasFirebaseClientConfig) return;
    let active = true;
    async function resume() {
      try {
        const { auth } = getFirebaseAuth();
        const credential = await resumeGoogleSignIn(auth);
        if (!active) return;
        if (credential) {
          busy.current = true;
          setLoading(true);
          await completeSignIn(auth, credential);
        }
      } catch (caught) {
        if (active) reportError(caught);
      } finally {
        if (active) {
          busy.current = false;
          setLoading(false);
          setReady(true);
        }
      }
    }
    void resume();
    return () => { active = false; };
  }, [completeSignIn, reportError]);

  async function handleSignIn() {
    if (!ready || busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const { auth, googleProvider } = getFirebaseAuth();
      const credential = await startGoogleSignIn(auth, googleProvider, {
        prefersRedirect: prefersGoogleRedirect(navigator),
        origin: window.location.origin,
      });
      // A redirect unloads this page. Do not clear Firebase's pending auth state.
      if (credential) await completeSignIn(auth, credential);
    } catch (caught) {
      reportError(caught);
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading || !ready || !hasFirebaseClientConfig}
        aria-describedby={!hasFirebaseClientConfig ? "firebase-login-help" : undefined}
        className="flex min-h-11 w-full items-center justify-center gap-3 rounded-pill border border-border bg-surface px-5 py-3 text-label font-medium text-text shadow-xs transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none"
      >
        <GoogleGlyph />
        {loading || (hasFirebaseClientConfig && !ready)
          ? pick(locale, { es: "Conectando...", en: "Connecting..." })
          : reviewLogin ? pick(locale, { es: "Continuar con Google", en: "Continue with Google" }) : pick(locale, {
              es: "Ingresar con cuenta autorizada",
              en: "Sign in with an authorized account",
            })}
      </button>
      {hasFirebaseClientConfig && (
        <details className="text-label leading-relaxed text-text-muted">
          <summary className="cursor-pointer rounded-sm text-center underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {pick(locale, { es: "¿Problemas para entrar con Google?", en: "Trouble signing in with Google?" })}
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            <p>
              {pick(locale, {
                es: "Si no puedes continuar con Face ID o una llave de acceso (passkey), o Google muestra un error de Bluetooth, pulsa «Probar otra manera» («Try another way») para usar tu contraseña u otro método disponible en tu cuenta.",
                en: "If you can't continue with Face ID or a passkey, or Google shows a Bluetooth error, select “Try another way” to use your password or another method available for your account.",
              })}
            </p>
            <p>
              {pick(locale, {
                es: "Si abriste el enlace dentro de otra app, usa su menú para abrirlo en Safari o Chrome y vuelve a intentarlo.",
                en: "If you opened the link inside another app, use its menu to open it in Safari or Chrome and try again.",
              })}
            </p>
          </div>
        </details>
      )}
      {!hasFirebaseClientConfig && (
        <p id="firebase-login-help" className="text-label leading-relaxed text-text-muted">
          {pick(locale, {
            es: "El acceso no está disponible en este momento. Contacta al administrador.",
            en: "Sign-in is currently unavailable. Contact your administrator.",
          })}
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
