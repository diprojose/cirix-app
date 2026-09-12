import type { Metadata } from "next";
import { requirePlatformUser } from "@/lib/auth/dal";
import { getCurrentLocale } from "@/lib/i18n";
import { PixelDashboard } from "@/modules/pixels/ui/pixel-dashboard";

export const metadata: Metadata = { title: "Pixel Hub", description: "Web measurement and pixel registry." };
export default async function PixelsPage() {
  await requirePlatformUser();
  return <PixelDashboard locale={await getCurrentLocale()} />;
}
