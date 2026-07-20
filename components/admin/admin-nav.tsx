"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The admin sections, in display order. */
const TABS = [
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/products", label: "Productos" },
  { href: "/admin/recipes", label: "Recetas" },
  { href: "/admin/premium", label: "Premium" },
  { href: "/admin/coupons", label: "Cupones" },
  { href: "/admin/rewards", label: "Recompensas" },
  { href: "/admin/fraude", label: "Fraude" },
  { href: "/admin/settings", label: "Ajustes" },
];

/**
 * AdminNav is the admin panel's tab bar. A small client island only because it
 * highlights the active section from the current pathname.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones del panel" className="flex gap-2 overflow-x-auto">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-ink text-on-accent"
                : "text-text-muted hover:bg-sugar-100 hover:text-text"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
