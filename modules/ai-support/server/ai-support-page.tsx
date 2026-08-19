import type { Metadata } from "next";
import { getCurrentLocale } from "@/lib/i18n";
import { getSupportMode } from "../application/support-mode";
import { AiSupportWorkspace } from "../ui/ai-support-workspace";

export const metadata: Metadata = {
  title: "AI Customer Support",
  description: "Bilingual customer-support demo for the Cirix loyalty storefront.",
};

export default async function AiSupportPage() {
  const locale = await getCurrentLocale();
  return <AiSupportWorkspace locale={locale} mode={getSupportMode()} />;
}
