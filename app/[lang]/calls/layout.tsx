import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocalizedLink } from "@/components/localized-link";
import { getCurrentLocale, pick } from "@/lib/i18n";

export default async function CallsLayout({ children }: { children: ReactNode }) {
  const locale = await getCurrentLocale();
  return <div className="min-h-dvh bg-bg"><header className="border-b border-border bg-brand-900 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4"><p className="font-heading text-lg font-bold">Cirix Call Tracking</p><div className="flex items-center gap-3"><LanguageSwitcher /><LocalizedLink href="/" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10">{pick(locale, { es: "Módulos", en: "Modules" })}</LocalizedLink></div></div></header><main className="mx-auto max-w-6xl px-5 py-8">{children}</main></div>;
}
