"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { localizeHref, pick, type Locale } from "@/lib/locale";
import s from "./crm.module.css";

const GROUPS = [
  {
    es: "Espacio de trabajo", en: "Workspace",
    items: [
      { href: "/zoho", es: "Vista general", en: "Overview", symbol: "◫", stage: "" },
      { href: "/zoho/kpis", es: "Rendimiento", en: "Performance", symbol: "↗", stage: "" },
      { href: "/zoho/demo-form", es: "Captura", en: "Capture", symbol: "+", stage: "" },
    ],
  },
  {
    es: "Pipeline comercial", en: "Sales pipeline",
    items: [
      { href: "/zoho/subscribers", es: "Suscriptores", en: "Subscribers", symbol: "01", stage: "subscriber" },
      { href: "/zoho/leads", es: "Leads", en: "Leads", symbol: "02", stage: "lead" },
      { href: "/zoho/prospects", es: "Prospectos", en: "Prospects", symbol: "03", stage: "prospect" },
      { href: "/zoho/customers", es: "Clientes", en: "Customers", symbol: "04", stage: "customer" },
    ],
  },
] as const;

export function CrmNav({ locale, counts = {}, mobile = false }: {
  locale: Locale;
  counts?: Record<string, number>;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/^\/(es|en)(?=\/|$)/, "").replace(/\/$/, "") || "/";
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobile) return;
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && active) {
      nav.scrollLeft += active.getBoundingClientRect().left - nav.getBoundingClientRect().left - 8;
    }
  }, [mobile, normalizedPath]);

  return (
    <nav ref={navRef} aria-label={pick(locale, { es: "Secciones CRM", en: "CRM sections" })} className={mobile ? s.mobileNav : s.nav}>
      {GROUPS.map((group) => (
        <div key={group.en} className={s.navGroup}>
          {!mobile && <p className={s.navLabel}>{pick(locale, group)}</p>}
          {group.items.map((item) => {
            const active = normalizedPath === item.href;
            return (
              <Link key={item.href} href={localizeHref(locale, item.href)} aria-current={active ? "page" : undefined} className={`${s.navLink} ${active ? s.navActive : ""}`}>
                <span className={s.navSymbol} aria-hidden="true">{item.symbol}</span>
                <span>{pick(locale, item)}</span>
                {item.stage && <span className={s.navCount}>{counts[item.stage] ?? 0}</span>}
              </Link>
            );
          })}
        </div>
      ))}
      <div className={s.navGroup}>
        {!mobile && <p className={s.navLabel}>{pick(locale, { es: "Datos", en: "Data" })}</p>}
        <Link href="/api/zoho/crm" prefetch={false} className={s.navLink}><span className={s.navSymbol} aria-hidden="true">↗</span>{pick(locale, { es: "Ver datos CRM", en: "View CRM data" })}</Link>
      </div>
    </nav>
  );
}
