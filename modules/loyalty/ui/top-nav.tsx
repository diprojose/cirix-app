import type { ViewerDto } from "@/core/iam/application/dtos/viewer-dto";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CartBadge } from "@/components/cart/cart-badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocalizedLink } from "@/components/localized-link";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { SearchBar } from "./search-bar";
import { WalletBadge } from "./wallet-badge";
import { BagIcon } from "./icons";

const LINK =
  "rounded-sm py-1 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export async function TopNav({
  viewer,
  wallet = null,
  searchable = false,
}: {
  viewer: ViewerDto;
  wallet?: { availableCents: number; currency: string; streakWeeks: number } | null;
  searchable?: boolean;
}) {
  const locale = await getCurrentLocale();

  return (
    <header className="hidden border-b border-border bg-surface md:block">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-8 py-3">
        <LocalizedLink
          href="/loyalty"
          className="rounded-sm text-xl font-bold tracking-tight text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          mixmag
        </LocalizedLink>

        {searchable ? (
          <SearchBar variant="desktop" className="max-w-md flex-1" />
        ) : (
          <span className="flex-1" />
        )}

        <nav className="flex items-center gap-6 text-label font-medium text-text">
          <LocalizedLink href="/loyalty" className={LINK}>
            {pick(locale, { es: "Inicio", en: "Home" })}
          </LocalizedLink>
          <LocalizedLink href="/referidos" className={LINK}>
            {pick(locale, { es: "Invita y gana", en: "Refer & earn" })}
          </LocalizedLink>
          {viewer.permissions.canOperateStore && (
            <LocalizedLink href="/admin" className={`${LINK} font-semibold text-action-strong`}>
              {pick(locale, { es: "Panel", en: "Admin" })}
            </LocalizedLink>
          )}
        </nav>

        <LanguageSwitcher />

        {wallet && (
          <WalletBadge
            availableCents={wallet.availableCents}
            currency={wallet.currency}
            streakWeeks={wallet.streakWeeks}
          />
        )}

        <LocalizedLink
          href="/cart"
          aria-label={pick(locale, { es: "Carrito", en: "Cart" })}
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-pill text-text transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <BagIcon className="h-6 w-6" />
          <CartBadge />
        </LocalizedLink>

        {viewer.authenticated ? (
          <SignOutButton className="min-h-11 shrink-0 rounded-pill border border-border px-4 text-label font-medium text-text transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface" />
        ) : (
          <LocalizedLink
            href="/login"
            className="inline-flex min-h-11 shrink-0 items-center rounded-pill bg-accent-fill px-5 text-label font-semibold text-on-accent shadow-accent transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fill focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {pick(locale, { es: "Iniciar sesiÃ³n", en: "Sign in" })}
          </LocalizedLink>
        )}
      </div>
    </header>
  );
}
