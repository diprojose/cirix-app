import type { Metadata } from "next";
import { CONTAINER_READ } from "@/components/store/layout";
import { CrmStagePage } from "@/components/zoho/crm-module-pages";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { makeGetCrmDashboard } from "@/modules/crm/infrastructure/di/crm-container";

export const metadata: Metadata = {
  title: "Zoho CRM Leads",
  description: "Operational leads screen for the CRM module.",
};

export default async function ZohoLeadsPage() {
  const locale = await getCurrentLocale();
  const result = await makeGetCrmDashboard().execute();

  if (!result.ok) {
    return (
      <main className={`${CONTAINER_READ} flex min-h-[24rem] items-center justify-center text-center`}>
        <p className="text-body text-text-muted">
          {pick(locale, {
            es: "No se pudieron cargar los leads.",
            en: "Leads could not be loaded.",
          })}
        </p>
      </main>
    );
  }

  return <CrmStagePage locale={locale} dashboard={result.value} stage="lead" />;
}

