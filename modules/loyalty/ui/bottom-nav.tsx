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
  const demoRelativePath = normalizedPath.replace(/^\/demo\/[^/]+/, "") || "/loyalty";

  return (
    <nav
      aria-label={pick(locale, { es: "Navegación principal", en: "Primary navigation" })}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid w-full max-w-[26rem] grid-cols-4 px-3 py-1.5">
        <NavItem
          label={pick(locale, { es: "Inicio", en: "Home" })}
          href="/loyalty"
          active={demoRelativePath === "/loyalty"}
          icon={<HomeIcon className="h-6 w-6" />}
        />
        <NavItem
          label={pick(locale, { es: "Carrito", en: "Cart" })}
          href="/cart"
          active={demoRelativePath === "/cart"}
          icon={<BagIcon className="h-6 w-6" />}
          badge={<CartBadge />}
        />
        <NavItem
          label={pick(locale, { es: "Mi saldo", en: "My balance" })}
          href="/billetera"
          active={demoRelativePath === "/billetera"}
          icon={<WalletIcon className="h-6 w-6" />}
        />
        <NavItem
          label={pick(locale, { es: "Invita y gana", en: "Refer & earn" })}
          href="/referidos"
          active={demoRelativePath === "/referidos"}
          icon={<UserIcon className="h-6 w-6" />}
        />
      </div>
      {canOperateStore && (
        <LocalizedLink
          href="/admin"
          aria-label={pick(locale, { es: "Panel de operador", en: "Operator panel" })}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-action-fill text-on-action"
        >
          <SlidersIcon className="h-4 w-4" />
        </LocalizedLink>
      )}
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
      className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[0.65rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${
        active
          ? "text-accent"
          : "text-text-muted hover:bg-stone-100 hover:text-text"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge}
    </LocalizedLink>
  );
}
