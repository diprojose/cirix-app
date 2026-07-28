"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LocalizedLink } from "@/components/localized-link";
import { useLocale } from "@/components/locale-provider";
import { CartBadge } from "@/components/cart/cart-badge";
import { pick } from "@/lib/locale";
import { HomeIcon, BagIcon, SlidersIcon, UserIcon, WalletIcon } from "./icons";

export function BottomNav({
  canOperateStore = false,
}: {
  canOperateStore?: boolean;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const normalizedPath = pathname.replace(/^\/(es|en)(?=\/|$)/, "") || "/";

  return (
    <nav
      aria-label={pick(locale, { es: "NavegaciÃ³n principal", en: "Primary navigation" })}
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mb-3 flex items-center gap-2 rounded-pill bg-surface p-2 shadow-float">
        <NavItem
          label={pick(locale, { es: "Inicio", en: "Home" })}
          href="/loyalty"
          active={normalizedPath === "/loyalty"}
          icon={<HomeIcon className="h-6 w-6" />}
        />
        <NavItem
          label={pick(locale, { es: "Carrito", en: "Cart" })}
          href="/cart"
          active={normalizedPath === "/cart"}
          icon={<BagIcon className="h-6 w-6" />}
          badge={<CartBadge />}
        />
        <NavItem
          label={pick(locale, { es: "Mi saldo", en: "My balance" })}
          href="/billetera"
          active={normalizedPath === "/billetera"}
          icon={<WalletIcon className="h-6 w-6" />}
        />
        <NavItem
          label={pick(locale, { es: "Invita y gana", en: "Refer & earn" })}
          href="/referidos"
          active={normalizedPath === "/referidos"}
          icon={<UserIcon className="h-6 w-6" />}
        />
        {canOperateStore && (
          <NavItem
            label={pick(locale, { es: "Panel", en: "Admin" })}
            href="/admin"
            active={normalizedPath.startsWith("/admin")}
            icon={<SlidersIcon className="h-6 w-6" />}
          />
        )}
      </div>
    </nav>
  );
}

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
    <LocalizedLink
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
    </LocalizedLink>
  );
}
