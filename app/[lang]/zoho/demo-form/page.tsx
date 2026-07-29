import type { Metadata } from "next";
import { CrmDemoFormPage } from "@/components/zoho/crm-module-pages";
import { getCurrentLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Zoho CRM Demo Form",
  description: "Demo form to test CRM lead capture.",
};

export default async function LocalizedZohoDemoFormPage() {
  const locale = await getCurrentLocale();
  return <CrmDemoFormPage locale={locale} />;
}
