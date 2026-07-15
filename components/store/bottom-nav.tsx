"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, HeartIcon, BagIcon, UserIcon } from "./icons";

/**
 * BottomNav is the floating mobile tab bar (hidden from `md` up, where the web
 * TopNav takes over). "Inicio" is the only wired destination for now; Favoritos,
 * Carrito and Perfil are presentational placeholders (their routes don't exist
 * yet) so nothing 404s. It sits above the safe-area inset.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mb-3 flex items-center gap-2 rounded-pill bg-surface p-2 shadow-float">
        <NavItem label="Inicio" href="/" active={pathname === "/"} icon={<HomeIcon className="h-6 w-6" />} />
        <NavItem label="Favoritos" icon={<HeartIcon className="h-6 w-6" />} />
        <NavItem label="Carrito" icon={<BagIcon className="h-6 w-6" />} />
        <NavItem label="Perfil" icon={<UserIcon className="h-6 w-6" />} />
      </div>
    </nav>
  );
}

/** A single tab: active fill, an inactive link, or a disabled placeholder. */
function NavItem({
  label,
  href,
  active = false,
  icon,
}: {
  label: string;
  href?: string;
  active?: boolean;
  icon: ReactNode;
}) {
  if (active) {
    return (
      <span
        aria-current="page"
        aria-label={label}
        className="grid h-12 w-12 place-items-center rounded-pill bg-accent-fill text-on-accent shadow-accent"
      >
        {icon}
      </span>
    );
  }

  if (href) {
    return (
      <Link
        href={href}
        aria-label={label}
        className="grid h-12 w-12 place-items-center rounded-pill text-sugar-400 transition-colors hover:text-text"
      >
        {icon}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${label} (próximamente)`}
      title="Próximamente"
      className="grid h-12 w-12 place-items-center rounded-pill text-sugar-400"
    >
      {icon}
    </button>
  );
}
