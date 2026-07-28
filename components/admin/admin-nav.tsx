"use client";

import { usePathname } from "next/navigation";
import { LocalizedLink } from "@/components/localized-link";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";

const TABS = [
  { href: "/admin/orders", es: "Pedidos", en: "Orders" },
  { href: "/admin/products", es: "Productos", en: "Products" },
  { href: "/admin/coupons", es: "Cupones", en: "Coupons" },
  { href: "/admin/rewards", es: "Recompensas", en: "Rewards" },
  { href: "/admin/fraude", es: "Fraude", en: "Fraud" },
  { href: "/admin/kpis", es: "KPIs", en: "KPIs" },
  { href: "/admin/settings", es: "Ajustes", en: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const normalizedPath = pathname.replace(/^\/(es|en)(?=\/|$)/, "") || "/";

  return (
    <nav
      aria-label={pick(locale, { es: "Secciones del panel", en: "Admin sections" })}
      className="flex gap-2 overflow-x-auto"
    >
      {TABS.map((tab) => {
        const active = normalizedPath.startsWith(tab.href);
        return (
          <LocalizedLink
            key={tab.href}
            href={tab.href}
            className={`shrink-0 rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-ink text-on-accent"
                : "text-text-muted hover:bg-stone-100 hover:text-text"
            }`}
          >
            {pick(locale, { es: tab.es, en: tab.en })}
          </LocalizedLink>
        );
      })}
    </nav>
  );
}
