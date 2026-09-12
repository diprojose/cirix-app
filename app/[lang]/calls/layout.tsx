import type { ReactNode } from "react";
import Image from "next/image";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocalizedLink } from "@/components/localized-link";
import { getCurrentLocale, pick } from "@/lib/i18n";
import s from "@/modules/calls/ui/calls.module.css";

export default async function CallsLayout({ children }: { children: ReactNode }) {
  const locale = await getCurrentLocale();
  return (
    <div className={s.workspace}>
      <a href="#calls-content" className={s.skipLink}>{pick(locale, { es: "Saltar al contenido", en: "Skip to content" })}</a>
      <header className={s.header}>
        <div className={`${s.container} ${s.headerInner}`}>
          <div className={s.brand}>
            <LocalizedLink href="/" aria-label={pick(locale, { es: "CIRIX — Inicio", en: "CIRIX — Home" })}>
              <Image src="/brand/logo-white.svg" alt="CIRIX" width={116} height={42} />
            </LocalizedLink>
            <span className={s.productName}>Call Tracking</span>
          </div>
          <nav className={s.headerActions} aria-label={pick(locale, { es: "Navegación del módulo", en: "Module navigation" })}>
            <div className={s.languageSwitcher}><LanguageSwitcher /></div>
            <LocalizedLink href="/" className={s.modulesLink}>{pick(locale, { es: "Módulos", en: "Modules" })}<span aria-hidden="true">↗</span></LocalizedLink>
          </nav>
        </div>
      </header>
      <main id="calls-content" className={`${s.container} ${s.main}`}>{children}</main>
      <footer className={`${s.container} ${s.footer}`}><span>CIRIX · CALL TRACKING</span><span>{pick(locale, { es: "Cada conversación cuenta.", en: "Every conversation counts." })}</span></footer>
    </div>
  );
}
