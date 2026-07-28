"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localizeHref, pick, type Locale } from "@/lib/locale";

const TABS = [
  { href: "/zoho", es: "Overview", en: "Overview" },
  { href: "/zoho/kpis", es: "KPIs", en: "KPIs" },
  { href: "/zoho/subscribers", es: "Subscribers", en: "Subscribers" },
  { href: "/zoho/leads", es: "Leads", en: "Leads" },
  { href: "/zoho/prospects", es: "Prospects", en: "Prospects" },
  { href: "/zoho/customers", es: "Customers", en: "Customers" },
  { href: "/zoho/demo-form", es: "Demo form", en: "Demo form" },
] as const;

export function CrmNav({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/^\/(es|en)(?=\/|$)/, "") || "/";

  return (
    <nav
      aria-label={pick(locale, { es: "Secciones CRM", en: "CRM sections" })}
      className="flex gap-2 overflow-x-auto"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/zoho"
            ? normalizedPath === "/zoho"
            : normalizedPath.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={localizeHref(locale, tab.href)}
            className={`shrink-0 rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-ink text-on-accent"
                : "text-text-muted hover:bg-stone-100 hover:text-text"
            }`}
          >
            {pick(locale, { es: tab.es, en: tab.en })}
          </Link>
        );
      })}
    </nav>
  );
}

