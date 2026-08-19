"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { LOCALES, pick, stripLocaleFromPathname } from "@/lib/locale";
import { useLocale } from "@/components/locale-provider";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { pathname: barePath } = stripLocaleFromPathname(pathname);
  const query = searchParams.toString();

  return (
    <div className="inline-flex items-center gap-1 rounded-pill border border-border bg-surface p-1 text-xs font-semibold">
      {LOCALES.map((target) => {
        const active = target === locale;
        const href = `/${target}${barePath === "/" ? "" : barePath}${query ? `?${query}` : ""}`;
        return (
          <a
            key={target}
            href={href}
            hrefLang={target}
            className={`rounded-pill px-3 py-1 transition-colors ${
              active ? "bg-accent-fill text-on-accent" : "text-text-muted hover:text-text"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {pick(target, { es: "ES", en: "EN" })}
          </a>
        );
      })}
    </div>
  );
}
