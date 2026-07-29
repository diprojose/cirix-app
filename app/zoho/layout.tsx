import { CrmShell } from "@/components/zoho/crm-shell";
import { getCurrentLocale } from "@/lib/i18n";
import { getZohoDashboardState } from "./dashboard";

export default async function ZohoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getCurrentLocale();
  const { dashboard, warning } = await getZohoDashboardState();

  return <CrmShell locale={locale} dashboard={dashboard} warning={warning}>{children}</CrmShell>;
}
