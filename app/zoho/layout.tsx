import { CrmShell } from "@/components/zoho/crm-shell";
import { getCurrentLocale } from "@/lib/i18n";
import { makeGetCrmDashboard } from "@/modules/crm/infrastructure/di/crm-container";

export default async function ZohoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getCurrentLocale();
  const result = await makeGetCrmDashboard().execute();

  return <CrmShell locale={locale} dashboard={result.ok ? result.value : null}>{children}</CrmShell>;
}
