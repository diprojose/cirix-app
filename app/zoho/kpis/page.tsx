import type { Metadata } from "next";
import { CONTAINER_READ } from "@/components/store/layout";
import { CrmKpisPage } from "@/components/zoho/crm-module-pages";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { makeGetCrmDashboard } from "@/modules/crm/infrastructure/di/crm-container";

export const metadata: Metadata = {
  title: "Zoho CRM KPIs",
  description: "Executive KPIs for the CRM module.",
};

export default async function ZohoKpisPage() {
  const locale = await getCurrentLocale();
  const result = await makeGetCrmDashboard().execute();

  if (!result.ok) {
    return (
      <main className={`${CONTAINER_READ} flex min-h-[24rem] items-center justify-center text-center`}>
        <p className="text-body text-text-muted">
          {pick(locale, {
            es: "No se pudieron cargar los KPIs del CRM.",
            en: "The CRM KPIs could not be loaded.",
          })}
        </p>
      </main>
    );
  }

  return <CrmKpisPage locale={locale} dashboard={result.value} />;
}

