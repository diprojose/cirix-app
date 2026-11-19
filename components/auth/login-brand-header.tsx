"use client";

import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";
import Image from "next/image";
import type { SessionAudience } from "@/lib/auth/audience";
import type { LoginBusinessBrand } from "@/lib/auth/login-business";

/** The single controlled entry point for every platform module. */
export function LoginBrandHeader({
  audience = "platform",
  business = null,
}: {
  audience?: SessionAudience;
  /** The business whose QR brought the person here: the screen wears its brand. */
  business?: LoginBusinessBrand | null;
}) {
  const locale = useLocale();
  const reviewLogin = audience === "reviews";
  const memberLogin = audience === "member";

  if (memberLogin && business) {
    return (
      <header className="flex flex-col items-center gap-3 text-center">
        {/* The same plate as the business's signup page and card. */}
        <div
          style={{ backgroundColor: business.color, color: business.ink }}
          className="mb-4 flex h-28 w-full max-w-xs items-center justify-center rounded-3xl px-8 shadow-[0_1px_3px_rgb(16_24_40/0.14)]"
        >
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- served by our own API, already sized.
            <img src={business.logoUrl} alt="" className="max-h-16 max-w-full object-contain" />
          ) : (
            <span aria-hidden="true" className="line-clamp-2 text-price-lg font-bold tracking-tight">
              {business.name}
            </span>
          )}
        </div>
        <h1 className="text-display font-bold tracking-tight text-text">{business.name}</h1>
        <p className="max-w-sm text-body text-text-muted">
          {business.purpose === "join"
            ? pick(locale, {
                es: "Entra con tu correo para unirte a su programa de beneficios. Lo usaremos para guardar tu tarjeta y lo que ganes.",
                en: "Sign in with your email to join their rewards program. We use it to keep your card and what you earn.",
              })
            : pick(locale, {
                es: "Entra con tu correo para ver tu tarjeta y tus beneficios.",
                en: "Sign in with your email to see your card and rewards.",
              })}
        </p>
      </header>
    );
  }

  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <Image src="/brand/logo-dark.svg" alt="CIRIX" width={160} height={57} className="mb-5 h-auto w-40" />
      <h1 className="text-display font-bold tracking-tight text-text">
        {reviewLogin
          ? pick(locale, { es: "Comparte tu experiencia", en: "Share your experience" })
          : memberLogin
            ? pick(locale, { es: "Entra a tu cuenta", en: "Sign in to your account" })
            : pick(locale, { es: "Acceso autorizado", en: "Authorized access" })}
      </h1>
      <p className="max-w-sm text-body text-text-muted">
        {memberLogin ? pick(locale, {
          es: "Verifica tu correo con Google o con un enlace enviado a tu email. Lo usaremos para guardar tus tarjetas y beneficios en cada negocio donde te registres.",
          en: "Verify your email with Google or an emailed link. We use it to keep your cards and rewards at each business where you sign up.",
        }) : reviewLogin ? pick(locale, {
          es: "Verifica tu correo con Google o con un enlace enviado a tu email para continuar. CIRIX vincula tu correo y, cuando esté disponible, tu nombre con tu visita y tu clic a Google para dar seguimiento.",
          en: "Verify your email with Google or an emailed link to continue. CIRIX links your email and, when available, your name to your visit and Google click for follow-up.",
        }) : pick(locale, {
          es: "Los módulos y demos de CIRIX requieren una cuenta habilitada previamente por un administrador. Verifica el correo autorizado con Google o con un enlace enviado a tu email.",
          en: "CIRIX modules and demos require an account previously enabled by an administrator. Verify your authorized email with Google or an emailed link.",
        })}
      </p>
    </header>
  );
}
