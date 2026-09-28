"use client";

import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";
import Image from "next/image";

/** The single controlled entry point for every platform module. */
export function LoginBrandHeader({ reviewLogin = false }: { reviewLogin?: boolean }) {
  const locale = useLocale();

  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <Image src="/brand/logo-white.svg" alt="CIRIX" width={160} height={57} className="mb-5 h-auto w-40" />
      <h1 className="text-display font-bold tracking-tight text-text">
        {reviewLogin
          ? pick(locale, { es: "Comparte tu experiencia", en: "Share your experience" })
          : pick(locale, { es: "Acceso autorizado", en: "Authorized access" })}
      </h1>
      <p className="max-w-sm text-body text-text-muted">
        {reviewLogin ? pick(locale, {
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
