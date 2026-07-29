import type { Metadata } from "next";
import { CrmLandingPage } from "@/components/zoho/crm-module-pages";
import { getCurrentLocale } from "@/lib/i18n";
import { getZohoDashboard } from "../../zoho/dashboard";

export const metadata: Metadata = {
  title: "Zoho CRM",
  description: "CRM module landing page with stage routes, KPIs, and demo capture.",
};

export default async function LocalizedZohoPage() {
  const locale = await getCurrentLocale();
  const dashboard = await getZohoDashboard();

  return <CrmLandingPage locale={locale} dashboard={dashboard} />;
}
