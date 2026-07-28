import type { Metadata } from "next";
import { CONTAINER_READ } from "@/components/store/layout";
import { CrmLandingPage } from "@/components/zoho/crm-module-pages";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { makeGetCrmDashboard } from "@/modules/crm/infrastructure/di/crm-container";

export const metadata: Metadata = {
  title: "Zoho CRM",
  description: "CRM module landing page with stage routes, KPIs, and demo capture.",
};

export default async function ZohoPage() {
  const locale = await getCurrentLocale();
  const result = await makeGetCrmDashboard().execute();

  if (!result.ok) {
    return (
      <main
        className={`${CONTAINER_READ} flex min-h-[24rem] flex-col items-center justify-center gap-2 text-center`}
      >
        <p className="text-title font-semibold text-text">
          {pick(locale, {
            es: "No se pudo cargar el módulo CRM.",
            en: "The CRM module could not be loaded.",
          })}
        </p>
        <p className="text-body text-text-muted">
          {pick(locale, {
            es: "Vuelve a intentarlo en un momento.",
            en: "Please try again in a moment.",
          })}
        </p>
      </main>
    );
  }

  return <CrmLandingPage locale={locale} dashboard={result.value} />;
}

