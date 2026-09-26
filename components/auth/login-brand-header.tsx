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
          es: "Inicia sesión con tu cuenta de Google para continuar y dejar una reseña. Todas las personas son bienvenidas.",
          en: "Sign in with your Google account to continue and leave a review. Everyone is welcome.",
        }) : pick(locale, {
          es: "Los módulos y demos de CIRIX están disponibles únicamente para cuentas creadas y habilitadas previamente por un administrador. Usa la cuenta de Google autorizada; no hay registro público.",
          en: "CIRIX modules and demos are available only to accounts previously created and enabled by an administrator. Use your authorized Google account; public registration is not available.",
        })}
      </p>
    </header>
  );
}
