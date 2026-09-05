"use client";

import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";
import { BrandLogo } from "@/modules/loyalty/branding/ui/brand-logo";
import { useBrand } from "@/modules/loyalty/branding/ui/brand-provider";

/** Brand-aware introduction shared by the default and white-label login routes. */
export function LoginBrandHeader() {
  const locale = useLocale();
  const { profile } = useBrand();

  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <BrandLogo />
      {profile.tagline && (
        <p className="max-w-sm text-label font-medium text-accent">
          {profile.tagline}
        </p>
      )}
      <h1 className="text-display font-bold tracking-tight text-text">
        {pick(locale, { es: "Bienvenido", en: "Welcome" })}
      </h1>
      <p className="max-w-sm text-body text-text-muted">
        {pick(locale, {
          es: `Inicia sesión en ${profile.displayName} para hacer pedidos y acumular saldo con cada compra.`,
          en: `Sign in to ${profile.displayName} to place orders and earn wallet credit with every purchase.`,
        })}
      </p>
    </header>
  );
}
