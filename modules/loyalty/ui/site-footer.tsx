import { LocalizedLink } from "@/components/localized-link";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { BrandLogo } from "@/modules/loyalty/branding/ui/brand-logo";

export async function SiteFooter() {
  const locale = await getCurrentLocale();

  return (
    <footer className="mt-12 hidden border-t border-border bg-surface md:block">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-8 py-10 text-sm text-text-muted md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <BrandLogo />
          <p className="mt-2">
            {pick(locale, {
              es: "Tu supermercado, a domicilio.",
              en: "Your grocery store, delivered.",
            })}
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-x-12 gap-y-2">
          <LocalizedLink href="/loyalty" className="hover:text-accent">
            {pick(locale, { es: "Tienda", en: "Store" })}
          </LocalizedLink>
          <LocalizedLink href="/billetera" className="hover:text-accent">
            {pick(locale, { es: "Mi saldo", en: "My balance" })}
          </LocalizedLink>
          <LocalizedLink href="/referidos" className="hover:text-accent">
            {pick(locale, { es: "Invita y gana", en: "Refer & earn" })}
          </LocalizedLink>
          <LocalizedLink href="/login" className="hover:text-accent">
            {pick(locale, { es: "Iniciar sesión", en: "Sign in" })}
          </LocalizedLink>
        </nav>
        <p className="text-xs">Compra segura · Beneficios reales</p>
      </div>
    </footer>
  );
}
