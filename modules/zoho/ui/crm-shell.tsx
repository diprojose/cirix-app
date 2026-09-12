import Image from "next/image";
import Link from "next/link";
import { localizeHref, pick, type Locale } from "@/lib/locale";
import type { CrmDashboardDto } from "@/modules/zoho/crm/application/dtos/crm-dashboard-dto";
import { CrmNav } from "./crm-nav";
import s from "./crm.module.css";

type CrmShellProps = {
  locale: Locale;
  dashboard: CrmDashboardDto;
  warning: string | null;
  children: React.ReactNode;
};

export function CrmShell({ locale, dashboard, warning, children }: CrmShellProps) {
  const t = (es: string, en: string) => pick(locale, { es, en });
  const counts = Object.fromEntries(dashboard.stageSummary.map((stage) => [stage.stage, stage.count]));

  return (
    <div className={`${s.theme} ${s.shell}`}>
      <a className={s.skipLink} href="#crm-content">{t("Saltar al contenido", "Skip to content")}</a>
      <aside className={s.sidebar}>
        <Link href={localizeHref(locale, "/")} className={s.brand} aria-label={t("CIRIX · Ir al inicio", "CIRIX · Go to home")}>
          <Image src="/brand/logo-white.svg" alt="CIRIX" width={116} height={42} />
          <span>DIGITAL BUSINESS SOLUTIONS</span>
        </Link>
        <div className={s.workspaceLabel}><span className={s.statusDot} /> CRM WORKSPACE</div>
        <CrmNav locale={locale} counts={counts} />
        <div className={s.sidebarFooter}>
          <p className={s.eyebrow}>{t("UNA VISIÓN CONECTADA", "A CONNECTED VISION")}</p>
          <p>{t("Cada oportunidad,", "Every opportunity,")}<br /><span>{t("en su lugar.", "in the right place.")}</span></p>
          <Link href={localizeHref(locale, "/")}>{t("Explorar ecosistema", "Explore ecosystem")} <span aria-hidden="true">↗</span></Link>
        </div>
      </aside>

      <div className={s.workspace}>
        <header className={s.header}>
          <Link href={localizeHref(locale, "/")} className={s.mobileBrand} aria-label={t("CIRIX · Ir al inicio", "CIRIX · Go to home")}>
            <Image src="/brand/logo-white.svg" alt="CIRIX" width={88} height={32} />
          </Link>
          <div className={s.breadcrumb}><span>CIRIX</span><span aria-hidden="true">/</span><strong>Zoho CRM</strong></div>
          <div className={s.headerActions}>
            <Link className={s.backLink} href={localizeHref(locale, "/")}>← {t("Ecosistema", "Ecosystem")}</Link>
            <Link className={s.primaryButton} href={localizeHref(locale, "/zoho/demo-form")}>
              {t("Nuevo lead", "New lead")} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </header>
        <div className={s.mobileNavigation}><CrmNav locale={locale} counts={counts} mobile /></div>
        {warning ? <div role="status" className={s.warning}>{warning}</div> : null}
        <main id="crm-content" tabIndex={-1} className={s.content}>{children}</main>
        <footer className={s.footer}><span>CIRIX · CRM</span><span>{t("De la primera conversación a la próxima compra.", "From the first conversation to the next purchase.")}</span></footer>
      </div>
    </div>
  );
}
