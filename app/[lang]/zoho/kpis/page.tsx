import type { Metadata } from "next";
import { CrmKpisPage } from "@/components/zoho/crm-module-pages";
import { getCurrentLocale } from "@/lib/i18n";
import { getZohoDashboard } from "../../../zoho/dashboard";

export const metadata: Metadata = {
  title: "Zoho CRM KPIs",
  description: "Executive KPIs for the CRM module.",
};

export default async function LocalizedZohoKpisPage() {
  const locale = await getCurrentLocale();
  const dashboard = await getZohoDashboard();

  return <CrmKpisPage locale={locale} dashboard={dashboard} />;
}
