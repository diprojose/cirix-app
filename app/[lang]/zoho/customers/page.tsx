import type { Metadata } from "next";
import { CrmStagePage } from "@/components/zoho/crm-module-pages";
import { getCurrentLocale } from "@/lib/i18n";
import { getZohoDashboard } from "../../../zoho/dashboard";

export const metadata: Metadata = {
  title: "Zoho CRM Customers",
  description: "Operational customers screen for the CRM module.",
};

export default async function LocalizedZohoCustomersPage() {
  const locale = await getCurrentLocale();
  const dashboard = await getZohoDashboard();

  return <CrmStagePage locale={locale} dashboard={dashboard} stage="customer" />;
}
