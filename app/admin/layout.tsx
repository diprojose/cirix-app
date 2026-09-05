import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocalizedLink } from "@/components/localized-link";
import { requireOperator } from "@/lib/auth/dal";
import { getCurrentLocale, pick } from "@/lib/i18n";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const locale = await getCurrentLocale();
  const viewer = await requireOperator();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-text">
              {pick(locale, { es: "Panel de operador", en: "Operator panel" })}
            </p>
            <p className="truncate text-xs text-text-muted">{viewer.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <LocalizedLink
              href="/loyalty"
              className="shrink-0 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-stone-100"
            >
              {pick(locale, { es: "< Tienda", en: "< Store" })}
            </LocalizedLink>
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl px-5 pb-3">
          <AdminNav />
        </div>
      </header>

      <main className="flex-1 pb-16">
        <div className="mx-auto w-full max-w-7xl px-5 pt-5">{children}</div>
      </main>
    </div>
  );
}
