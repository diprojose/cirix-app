import type { Metadata } from "next";
import { CrmStagePage } from "@/components/zoho/crm-module-pages";
import { getCurrentLocale } from "@/lib/i18n";
import { getZohoDashboard } from "../../../zoho/dashboard";

export const metadata: Metadata = {
  title: "Zoho CRM Subscribers",
  description: "Operational subscriber screen for the CRM module.",
};

export default async function LocalizedZohoSubscribersPage() {
  const locale = await getCurrentLocale();
  const dashboard = await getZohoDashboard();

  return <CrmStagePage locale={locale} dashboard={dashboard} stage="subscriber" />;
}
