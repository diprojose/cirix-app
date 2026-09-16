import type { Metadata } from "next";
import { requirePlatformUser } from "@/lib/auth/dal";
import { getCurrentLocale } from "@/lib/i18n";
import { ReviewsDashboard } from "../ui/reviews-dashboard";
export const metadata: Metadata = { title: "Google Reviews | Cirix", robots: { index: false, follow: false } };
export default async function DashboardPage() {
  await requirePlatformUser();
  return <ReviewsDashboard locale={await getCurrentLocale()} />;
}
