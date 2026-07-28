"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CartBadge } from "@/components/cart/cart-badge";
import { HomeIcon, BagIcon, SlidersIcon, UserIcon, WalletIcon } from "./icons";

/**
 * BottomNav is the floating mobile tab bar (hidden from `md` up, where the web
 * TopNav takes over). Every tab is a real destination: the previous version
 * shipped a dead "Favoritos" tab and a dead "+" button while leaving the wallet
 * and referrals unreachable on a phone. The cart tab carries a live item-count
 * badge. It sits above the safe-area inset.
 *
 * Operators get an extra tab for the admin panel: the `/admin` link lives in the
 * desktop-only TopNav, so without it the panel is unreachable on a phone — the
 * primary screen for this app.
 */
export function BottomNav({
  canOperateStore = false,
}: {
  canOperateStore?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mb-3 flex items-center gap-2 rounded-pill bg-surface p-2 shadow-float">
        <NavItem
          label="Inicio"
          href="/loyalty"
          active={pathname === "/loyalty"}
          icon={<HomeIcon className="h-6 w-6" />}
        />
        <NavItem
          label="Carrito"
          href="/cart"
          active={pathname === "/cart"}
          icon={<BagIcon className="h-6 w-6" />}
          badge={<CartBadge />}
        />
        <NavItem
          label="Mi saldo"
          href="/billetera"
          active={pathname === "/billetera"}
          icon={<WalletIcon className="h-6 w-6" />}
        />
        <NavItem
          label="Invita y gana"
          href="/referidos"
          active={pathname === "/referidos"}
          icon={<UserIcon className="h-6 w-6" />}
        />
        {canOperateStore && (
          <NavItem
            label="Panel"
            href="/admin"
            active={pathname.startsWith("/admin")}
            icon={<SlidersIcon className="h-6 w-6" />}
          />
        )}
      </div>
    </nav>
  );
}

/** A single tab: an accent-filled current page, or a plain link. */
function NavItem({
  label,
  href,
  active = false,
  icon,
  badge,
}: {
  label: string;
  href: string;
  active?: boolean;
  icon: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`relative grid h-12 w-12 place-items-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
        active
          ? "bg-accent-fill text-on-accent shadow-accent"
          : "text-text-muted hover:bg-stone-100 hover:text-text"
      }`}
    >
      {icon}
      {badge}
    </Link>
  );
}
