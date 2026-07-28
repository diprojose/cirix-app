import Link from "next/link";
import type { ViewerDto } from "@/modules/iam/application/dtos/viewer-dto";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CartBadge } from "@/components/cart/cart-badge";
import { SearchBar } from "./search-bar";
import { WalletBadge } from "./wallet-badge";
import { BagIcon } from "./icons";

/** Shared focus treatment for the nav's inline text links. */
const LINK =
  "rounded-sm py-1 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

/**
 * TopNav is the desktop/web navigation bar (hidden below `md`, where the mobile
 * app chrome takes over): brand, search, primary links, cart, wallet balance
 * and an account area.
 *
 * `searchable` is opt-in because the search box writes to the catalog's search
 * context, which only exists on the storefront. Rendering it on the cart or
 * checkout would put a live-looking control on a page with nothing to filter.
 */
export function TopNav({
  viewer,
  wallet = null,
  searchable = false,
}: {
  viewer: ViewerDto;
  wallet?: { availableCents: number; currency: string; streakWeeks: number } | null;
  searchable?: boolean;
}) {
  return (
    <header className="hidden border-b border-border bg-surface md:block">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-8 py-3">
        <Link
          href="/loyalty"
          className="rounded-sm text-xl font-bold tracking-tight text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          mixmag
        </Link>

        {searchable ? (
          <SearchBar variant="desktop" className="max-w-md flex-1" />
        ) : (
          <span className="flex-1" />
        )}

        <nav className="flex items-center gap-6 text-label font-medium text-text">
          <Link href="/loyalty" className={LINK}>
            Inicio
          </Link>
          <Link href="/referidos" className={LINK}>
            Invita y gana
          </Link>
          {viewer.permissions.canOperateStore && (
            <Link href="/admin" className={`${LINK} font-semibold text-action-strong`}>
              Panel
            </Link>
          )}
        </nav>

        {wallet && (
          <WalletBadge
            availableCents={wallet.availableCents}
            currency={wallet.currency}
            streakWeeks={wallet.streakWeeks}
          />
        )}

        <Link
          href="/cart"
          aria-label="Carrito"
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-pill text-text transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <BagIcon className="h-6 w-6" />
          <CartBadge />
        </Link>

        {viewer.authenticated ? (
          <SignOutButton className="min-h-11 shrink-0 rounded-pill border border-border px-4 text-label font-medium text-text transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface" />
        ) : (
          <Link
            href="/login"
            className="inline-flex min-h-11 shrink-0 items-center rounded-pill bg-accent-fill px-5 text-label font-semibold text-on-accent shadow-accent transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fill focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Iniciar sesión
          </Link>
        )}
      </div>
    </header>
  );
}
