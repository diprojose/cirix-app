"use client";

import { usePathname } from "next/navigation";
import { LocalizedLink } from "@/components/localized-link";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";

/** One section of the business panel. The server decides which ones the viewer's role may see. */
export type BusinessNavItem = { href: string; label: string };

/**
 * The business panel's section tabs. They stay put while the page below
 * changes, and scroll sideways on a phone when they do not fit.
 */
export function BusinessNav({ home, items }: { home: string; items: BusinessNavItem[] }) {
  const pathname = usePathname();
  const locale = useLocale();
  const current = pathname.replace(/^\/(es|en)(?=\/|$)/, "") || "/";

  return (
    <nav
      aria-label={pick(locale, { es: "Secciones del negocio", en: "Business sections" })}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0 print:hidden"
    >
      {items.map((item) => {
        // The home tab only lights up on the home page itself, not on every section below it.
        const active = item.href === home ? current === home : current === item.href || current.startsWith(`${item.href}/`);
        return (
          <LocalizedLink
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center rounded-pill border px-4 py-2 text-label font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              active
                ? "border-transparent bg-accent-fill text-on-accent"
                : "border-border bg-surface text-text hover:bg-stone-100"
            }`}
          >
            {item.label}
          </LocalizedLink>
        );
      })}
    </nav>
  );
}
