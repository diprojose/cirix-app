import Link from "next/link";
import { CONTAINER } from "@/components/store/layout";
import { CrmNav } from "@/components/zoho/crm-nav";
import { getCurrentLocale } from "@/lib/i18n";
import { localizeHref, pick } from "@/lib/locale";

export default async function ZohoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getCurrentLocale();

  return (
    <div className="min-h-dvh bg-bg">
      <section className="border-b border-border bg-[radial-gradient(circle_at_top,rgba(183,99,37,0.16),transparent_48%),linear-gradient(180deg,var(--color-stone-0),var(--color-bg))]">
        <div className={`${CONTAINER} py-8 md:py-10`}>
          <div className="flex items-center justify-between gap-4">
            <Link
              href={localizeHref(locale, "/")}
              className="inline-flex min-h-11 items-center rounded-pill border border-border bg-surface px-4 text-label font-medium text-text transition-colors hover:bg-stone-100"
            >
              {pick(locale, { es: "Volver a módulos", en: "Back to modules" })}
            </Link>
            <span className="rounded-pill bg-action-soft px-3 py-1 text-caption font-semibold uppercase tracking-[0.18em] text-action-strong">
              {pick(locale, { es: "CRM operativo", en: "Operating CRM" })}
            </span>
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <p className="text-label font-semibold uppercase tracking-[0.18em] text-action-strong">
                Zoho CRM
              </p>
              <p className="mt-2 max-w-3xl text-body text-text-muted md:text-lg">
                {pick(locale, {
                  es: "Rutas separadas para KPIs, stages del funnel y formulario demo, todas sobre el mismo modelo CRM normalizado.",
                  en: "Separate routes for KPIs, funnel stages, and the demo form, all on top of the same normalized CRM model.",
                })}
              </p>
            </div>
            <CrmNav locale={locale} />
          </div>
        </div>
      </section>

      <main className={`${CONTAINER} py-8 md:py-10`}>{children}</main>
    </div>
  );
}

