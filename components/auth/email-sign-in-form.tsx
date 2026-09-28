"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { isSignInWithEmailLink } from "firebase/auth";
import { useLocale } from "@/components/locale-provider";
import { useToast } from "@/components/toast-provider";
import { getFirebaseAuth, hasFirebaseClientConfig } from "@/lib/firebase/client";
import { completeEmailSignIn, rememberedSignInEmail, requestEmailSignIn } from "@/lib/firebase/email-sign-in";
import { firebaseErrorCode } from "@/lib/firebase/google-sign-in";
import { SessionExchangeError } from "@/lib/firebase/session";
import { localizeHref, pick, type Locale } from "@/lib/locale";

function errorMessage(error: unknown, locale: Locale): string {
  if (error instanceof SessionExchangeError) {
    return pick(locale, error.accessDenied ? {
      es: "Esta cuenta no tiene acceso autorizado. Solicita al administrador que la habilite previamente.",
      en: "This account is not authorized. Ask your administrator to enable access first.",
    } : {
      es: "Verificamos el correo, pero no pudimos crear la sesión. Solicita un nuevo enlace e inténtalo otra vez.",
      en: "Your email was verified, but we couldn't create the session. Request a new link and try again.",
    });
  }
  switch (firebaseErrorCode(error)) {
    case "auth/invalid-email":
      return pick(locale, { es: "Introduce un correo electrónico válido.", en: "Enter a valid email address." });
    case "auth/expired-action-code":
    case "auth/invalid-action-code":
      return pick(locale, {
        es: "El enlace venció, ya fue utilizado o no es válido. Solicita un nuevo enlace.",
        en: "This link has expired, was already used, or is invalid. Request a new link.",
      });
    case "auth/invalid-credential":
      return pick(locale, {
        es: "No pudimos verificar el enlace con ese correo. Usa la dirección que recibió el mensaje o solicita un nuevo enlace.",
        en: "We couldn't verify the link with that email. Use the address that received the message or request a new link.",
      });
    case "auth/too-many-requests":
    case "auth/quota-exceeded":
      return pick(locale, { es: "Espera unos minutos antes de solicitar otro enlace.", en: "Wait a few minutes before requesting another link." });
    case "auth/operation-not-allowed":
      return pick(locale, {
        es: "El acceso por correo no está disponible en este momento. Puedes continuar con Google o contactar al administrador.",
        en: "Email sign-in is currently unavailable. You can continue with Google or contact your administrator.",
      });
    default:
      return pick(locale, {
        es: "No pudimos completar el acceso por correo. Revisa tu conexión e inténtalo de nuevo. Si el enlace ya fue utilizado, solicita uno nuevo.",
        en: "We couldn't complete email sign-in. Check your connection and try again. If the link was already used, request a new one.",
      });
  }
}

export function EmailSignInForm({
  redirectTo = null,
  reviewLogin = false,
  completeLink = false,
}: {
  redirectTo?: string | null;
  reviewLogin?: boolean;
  completeLink?: boolean;
}) {
  const locale = useLocale();
  const { error: showError } = useToast();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(!completeLink);
  const [validLink, setValidLink] = useState(true);
  const [retryAt, setRetryAt] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    if (!completeLink || !hasFirebaseClientConfig) return;
    let active = true;
    async function prepare() {
      try {
        const { auth } = getFirebaseAuth();
        await auth.authStateReady();
        if (!active) return;
        setEmail(rememberedSignInEmail());
        setValidLink(isSignInWithEmailLink(auth, window.location.href));
        setReady(true);
      } catch (error) {
        if (active) showError(errorMessage(error, locale));
      }
    }
    void prepare();
    return () => { active = false; };
  }, [completeLink, locale, showError]);

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !ready || !validLink || retryAt || !hasFirebaseClientConfig) return;
    busy.current = true;
    setLoading(true);
    try {
      const { auth } = getFirebaseAuth();
      if (completeLink) {
        const landing = await completeEmailSignIn(auth, email, window.location.href, reviewLogin ? "reviews" : "platform");
        window.location.replace(redirectTo ?? localizeHref(locale, landing));
        return;
      }
      const recipient = await requestEmailSignIn(auth, email, {
        origin: window.location.origin, locale, redirectTo,
      });
      setSentTo(recipient);
      setRetryAt(Date.now() + 60_000);
    } catch (error) {
      showError(errorMessage(error, locale));
    }
    busy.current = false;
    setLoading(false);
  }

  const loginUrl = localizeHref(locale, `/login${redirectTo ? `?from=${encodeURIComponent(redirectTo)}` : ""}`);
  return (
    <section className="flex flex-col gap-3" aria-labelledby="email-sign-in-title">
      <h2 id="email-sign-in-title" className="text-center text-body font-medium text-text">
        {pick(locale, completeLink ? { es: "Confirma tu correo", en: "Confirm your email" } : {
          es: "Continuar con mi correo", en: "Continue with my email",
        })}
      </h2>
      <p id="email-sign-in-help" className="text-label leading-relaxed text-text-muted">
        {pick(locale, completeLink ? {
          es: "Confirma la dirección que recibió el enlace para verificar tu correo y continuar. Si abriste el mensaje en otro dispositivo, escríbela aquí.",
          en: "Confirm the address that received the link to verify your email and continue. If you opened the message on another device, enter it here.",
        } : {
          es: "Te enviaremos un enlace para verificar tu correo y continuar, sin contraseña.",
          en: "We'll email you a link to verify your address and continue, without a password.",
        })}
      </p>
      {ready && !validLink && (
        <p role="alert" className="text-label text-text">
          {pick(locale, { es: "Este enlace no es válido. Solicita uno nuevo para continuar.", en: "This link is invalid. Request a new one to continue." })}
        </p>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3" aria-busy={loading}>
        <label htmlFor="sign-in-email" className="text-label font-medium text-text">
          {pick(locale, { es: "Correo electrónico", en: "Email address" })}
        </label>
        <input id="sign-in-email" name="email" type="email" autoComplete="email" inputMode="email"
          autoCapitalize="none" spellCheck={false} required maxLength={254}
          value={email} onChange={(event) => setEmail(event.target.value)}
          disabled={loading || !ready || !hasFirebaseClientConfig || !validLink}
          aria-describedby="email-sign-in-help"
          className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-3 text-body text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent disabled:opacity-60" />
        <button type="submit" disabled={loading || !ready || !hasFirebaseClientConfig || !validLink || !!retryAt}
          className="min-h-11 w-full rounded-pill bg-accent-fill px-5 py-3 text-label font-medium text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60">
          {loading ? pick(locale, { es: "Procesando...", en: "Processing..." })
            : completeLink ? pick(locale, { es: "Verificar y continuar", en: "Verify and continue" })
            : sentTo ? pick(locale, { es: "Enviar otro enlace", en: "Send another link" })
            : pick(locale, { es: "Enviar enlace de acceso", en: "Send sign-in link" })}
        </button>
      </form>
      {sentTo && <div role="status" className="flex flex-col gap-1 text-label leading-relaxed text-text">
        <p>{pick(locale, { es: "Enviamos un enlace a", en: "We sent a link to" })} <strong className="break-all">{sentTo}</strong>.</p>
        <p>{pick(locale, { es: "Abre el mensaje para continuar. Si no lo ves, revisa correo no deseado.", en: "Open the message to continue. If you don't see it, check your spam folder." })}</p>
        {!!retryAt && <p>{pick(locale, { es: "Podrás solicitar otro enlace en un minuto.", en: "You can request another link in one minute." })}</p>}
      </div>}
      {completeLink && <a href={loginUrl} className="text-center text-label text-accent underline underline-offset-4">
        {pick(locale, { es: "Solicitar un nuevo enlace o continuar con Google", en: "Request a new link or continue with Google" })}
      </a>}
    </section>
  );
}
